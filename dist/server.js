
   import { createRequire } from 'module';
   const require = createRequire(import.meta.url);
  

// src/app.ts
import cors from "cors";
import express from "express";

// src/modules/auth/auth.route.ts
import { Router } from "express";

// src/db/index.ts
import { Pool } from "pg";

// src/config/index.ts
import dotenv from "dotenv";
import path from "path";
dotenv.config({
  path: path.join(process.cwd(), ".env")
});
var fallbackNeon = "postgresql://neondb_owner:npg_B2lE8zAGIaeg@ep-twilight-star-aq8pmibs-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
var config = {
  connection_string: process.env.DATABASE_URL || process.env.CONNECTIONSTRING || fallbackNeon,
  port: Number(process.env.PORT || 5e3),
  jwtSecret: process.env.JWT_SECRET || "devpulse-development-secret",
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10)
};
var config_default = config;

// src/db/index.ts
var pool = new Pool({
  connectionString: config_default.connection_string,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 15e3
});
var initDB = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users(
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'contributor',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT users_role_check CHECK (role IN ('contributor', 'maintainer'))
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS issues(
        id SERIAL PRIMARY KEY,
        title VARCHAR(150) NOT NULL,
        description TEXT NOT NULL,
        type VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        reporter_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT issues_type_check CHECK (type IN ('bug', 'feature_request')),
        CONSTRAINT issues_status_check CHECK (status IN ('open', 'in_progress', 'resolved'))
      )
    `);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'contributor';`).catch(() => {
    });
    await pool.query(`ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(100);`).catch(() => {
    });
    await pool.query(`ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);`).catch(() => {
    });
    await pool.query(`ALTER TABLE users ALTER COLUMN password TYPE TEXT;`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS title VARCHAR(150);`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS description TEXT;`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS type VARCHAR(20);`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS reporter_id INT;`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ALTER COLUMN title TYPE VARCHAR(150);`).catch(() => {
    });
    await pool.query(`ALTER TABLE issues ALTER COLUMN status SET DEFAULT 'open';`).catch(() => {
    });
    await pool.query(`
      CREATE OR REPLACE FUNCTION set_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`DROP TRIGGER IF EXISTS users_updated_at_trigger ON users;`);
    await pool.query(`CREATE TRIGGER users_updated_at_trigger BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    await pool.query(`DROP TRIGGER IF EXISTS issues_updated_at_trigger ON issues;`);
    await pool.query(`CREATE TRIGGER issues_updated_at_trigger BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION set_updated_at();`);
    console.log("Database connected successfully!");
  } catch (error) {
    console.log(error);
  }
};

// src/utils/password.ts
import bcrypt from "bcrypt";
var hashPassword = async (password) => {
  return bcrypt.hash(password, config_default.bcryptSaltRounds);
};
var comparePassword = async (plainPassword, hashedPassword) => {
  return bcrypt.compare(plainPassword, hashedPassword);
};

// src/utils/jwt.ts
import jwt from "jsonwebtoken";
var signAccessToken = (payload) => {
  return jwt.sign(payload, config_default.jwtSecret, { expiresIn: "7d" });
};
var verifyAccessToken = (token) => {
  return jwt.verify(token, config_default.jwtSecret);
};

// src/modules/auth/auth.service.ts
var AUTH_USER_FIELDS = "id, name, email, role, created_at, updated_at";
var signupUserIntoDB = async (payload) => {
  const hashedPassword = await hashPassword(payload.password);
  let user;
  try {
    const result = await pool.query(
      `
        INSERT INTO users(name, email, password, role)
        VALUES($1, $2, $3, $4)
        RETURNING ${AUTH_USER_FIELDS}
      `,
      [payload.name, payload.email, hashedPassword, payload.role ?? "contributor"]
    );
    user = result.rows[0];
  } catch (error) {
    const dbError = error;
    if (dbError.code === "23505") {
      throw new Error("Email already exists");
    }
    throw error;
  }
  if (!user) {
    throw new Error("Failed to register user");
  }
  return user;
};
var loginUserIntoDB = async (payload) => {
  const result = await pool.query(
    `
      SELECT id, name, email, password, role, created_at, updated_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [payload.email]
  );
  const user = result.rows[0];
  if (!user) {
    throw new Error("Invalid email or password");
  }
  const isPasswordValid = await comparePassword(payload.password, user.password);
  if (!isPasswordValid) {
    throw new Error("Invalid email or password");
  }
  const token = signAccessToken({
    id: user.id,
    name: user.name,
    role: user.role
  });
  const { password, ...safeUser } = user;
  return {
    token,
    user: safeUser
  };
};

// src/modules/auth/auth.controller.ts
var isValidRole = (role) => {
  return role === "contributor" || role === "maintainer";
};
var signup = async (req, res) => {
  try {
    const body = req.body;
    const role = body.role ?? "contributor";
    if (!body.name || !body.email || !body.password) {
      res.status(400).json({ success: false, message: "name, email and password are required" });
      return;
    }
    if (!isValidRole(role)) {
      res.status(400).json({ success: false, message: "role must be contributor or maintainer" });
      return;
    }
    if (body.name.length > 100) {
      res.status(400).json({ success: false, message: "name is too long (max 100)" });
      return;
    }
    if (body.email.length > 255) {
      res.status(400).json({ success: false, message: "email is too long (max 255)" });
      return;
    }
    if (body.password.length < 8) {
      res.status(400).json({ success: false, message: "password must be at least 8 characters" });
      return;
    }
    const user = await signupUserIntoDB({
      name: body.name,
      email: body.email,
      password: body.password,
      role
    });
    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const statusCode = message === "Email already exists" ? 400 : 500;
    res.status(statusCode).json({
      success: false,
      message,
      errors: error
    });
  }
};
var login = async (req, res) => {
  try {
    const body = req.body;
    if (!body.email || !body.password) {
      res.status(400).json({ success: false, message: "email and password are required" });
      return;
    }
    const data = await loginUserIntoDB({
      email: body.email,
      password: body.password
    });
    res.status(200).json({
      success: true,
      message: "Login successful",
      data
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const statusCode = message === "Invalid email or password" ? 401 : 500;
    res.status(statusCode).json({
      success: false,
      message,
      errors: error
    });
  }
};
var authController = {
  signup,
  login
};

// src/modules/auth/auth.route.ts
var router = Router();
router.post("/signup", authController.signup);
router.post("/login", authController.login);
var authRoute = router;

// src/modules/issues/issues.route.ts
import { Router as Router2 } from "express";

// src/middleware/auth.middleware.ts
var extractToken = (authorizationHeader) => {
  if (!authorizationHeader) {
    return null;
  }
  return authorizationHeader.startsWith("Bearer ") ? authorizationHeader.slice(7) : authorizationHeader;
};
var authenticate = (req, res, next) => {
  const token = extractToken(req.header("authorization") ?? void 0);
  if (!token) {
    res.status(401).json({ success: false, message: "Missing authorization token" });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

// src/middleware/role.middleware.ts
var requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: "You do not have permission for this action" });
      return;
    }
    next();
  };
};

// src/utils/appError.ts
var AppError = class extends Error {
  statusCode;
  errors;
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};

// src/modules/issues/issues.service.ts
var ISSUE_FIELDS = "id, title, description, type, status, reporter_id, created_at, updated_at";
var buildReporterMap = async (reporterIds) => {
  if (reporterIds.length === 0) {
    return /* @__PURE__ */ new Map();
  }
  const result = await pool.query(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [reporterIds]
  );
  return new Map(result.rows.map((reporter) => [reporter.id, reporter]));
};
var convertIssues = async (issues) => {
  const reporterIds = [...new Set(issues.map((issue) => issue.reporter_id))];
  const reporterMap = await buildReporterMap(reporterIds);
  return issues.map((issue) => {
    const reporter = reporterMap.get(issue.reporter_id);
    return {
      id: issue.id,
      title: issue.title,
      description: issue.description,
      type: issue.type,
      status: issue.status,
      reporter: reporter ?? { id: issue.reporter_id, name: "Unknown", role: "contributor" },
      created_at: issue.created_at,
      updated_at: issue.updated_at
    };
  });
};
var createIssue = async (payload, reporterId) => {
  const result = await pool.query(
    `
      INSERT INTO issues(title, description, type, reporter_id)
      VALUES($1, $2, $3, $4)
      RETURNING ${ISSUE_FIELDS}
    `,
    [payload.title, payload.description, payload.type, reporterId]
  );
  const issue = result.rows[0];
  if (!issue) {
    throw new AppError(500, "Failed to create issue");
  }
  return issue;
};
var getAllIssues = async (filters) => {
  const conditions = [];
  const values = [];
  if (filters.type) {
    values.push(filters.type);
    conditions.push(`type = $${values.length}`);
  }
  if (filters.status) {
    values.push(filters.status);
    conditions.push(`status = $${values.length}`);
  }
  const orderBy = filters.sort === "oldest" ? "ASC" : "DESC";
  const query = `SELECT ${ISSUE_FIELDS} FROM issues${conditions.length ? ` WHERE ${conditions.join(" AND ")}` : ""} ORDER BY created_at ${orderBy}`;
  const result = await pool.query(query, values);
  return convertIssues(result.rows);
};
var getIssueById = async (id) => {
  const result = await pool.query(
    `SELECT ${ISSUE_FIELDS} FROM issues WHERE id = $1 LIMIT 1`,
    [id]
  );
  const issue = result.rows[0];
  if (!issue) {
    return null;
  }
  const [formatted] = await convertIssues([issue]);
  if (!formatted) {
    return null;
  }
  return formatted;
};
var getIssueEntityById = async (id) => {
  const result = await pool.query(
    `SELECT ${ISSUE_FIELDS} FROM issues WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
};
var updateIssue = async (id, payload) => {
  const values = [];
  const updates = [];
  if (payload.title !== void 0) {
    values.push(payload.title);
    updates.push(`title = $${values.length}`);
  }
  if (payload.description !== void 0) {
    values.push(payload.description);
    updates.push(`description = $${values.length}`);
  }
  if (payload.type !== void 0) {
    values.push(payload.type);
    updates.push(`type = $${values.length}`);
  }
  if (payload.status !== void 0) {
    values.push(payload.status);
    updates.push(`status = $${values.length}`);
  }
  if (updates.length === 0) {
    throw new AppError(400, "At least one field is required to update the issue");
  }
  updates.push(`updated_at = NOW()`);
  values.push(id);
  const query = `UPDATE issues SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING ${ISSUE_FIELDS}`;
  const result = await pool.query(query, values);
  return result.rows[0] ?? null;
};
var deleteIssue = async (id) => {
  const result = await pool.query(`DELETE FROM issues WHERE id = $1`, [id]);
  return result.rowCount ?? 0;
};
var getSystemMetrics = async () => {
  const [usersResult, issuesResult, openResult, inProgressResult, resolvedResult, bugResult, featureResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::text AS count FROM users`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'open'`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'in_progress'`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'resolved'`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues WHERE type = 'bug'`),
    pool.query(`SELECT COUNT(*)::text AS count FROM issues WHERE type = 'feature_request'`)
  ]);
  return {
    total_users: Number(usersResult.rows[0]?.count ?? 0),
    total_issues: Number(issuesResult.rows[0]?.count ?? 0),
    open_issues: Number(openResult.rows[0]?.count ?? 0),
    in_progress_issues: Number(inProgressResult.rows[0]?.count ?? 0),
    resolved_issues: Number(resolvedResult.rows[0]?.count ?? 0),
    bug_issues: Number(bugResult.rows[0]?.count ?? 0),
    feature_request_issues: Number(featureResult.rows[0]?.count ?? 0)
  };
};

// src/modules/issues/issues.controller.ts
var isIssueType = (value) => value === "bug" || value === "feature_request";
var isIssueStatus = (value) => value === "open" || value === "in_progress" || value === "resolved";
var parseIssueId = (value) => {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};
var createIssueHandler = async (req, res) => {
  try {
    const body = req.body;
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    if (!body.title || !body.description || !body.type) {
      res.status(400).json({ success: false, message: "title, description and type are required" });
      return;
    }
    if (body.title.length > 150) {
      res.status(400).json({ success: false, message: "title must be at most 150 characters" });
      return;
    }
    if (body.description.length < 20) {
      res.status(400).json({ success: false, message: "description must be at least 20 characters" });
      return;
    }
    if (!isIssueType(body.type)) {
      res.status(400).json({ success: false, message: "type must be bug or feature_request" });
      return;
    }
    const issue = await createIssue(
      {
        title: body.title,
        description: body.description,
        type: body.type
      },
      req.user.id
    );
    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var getIssuesHandler = async (req, res) => {
  try {
    const sort = req.query.sort;
    const type = req.query.type;
    const status = req.query.status;
    if (sort && sort !== "newest" && sort !== "oldest") {
      res.status(400).json({ success: false, message: "sort must be newest or oldest" });
      return;
    }
    if (type && !isIssueType(type)) {
      res.status(400).json({ success: false, message: "type must be bug or feature_request" });
      return;
    }
    if (status && !isIssueStatus(status)) {
      res.status(400).json({ success: false, message: "status must be open, in_progress or resolved" });
      return;
    }
    const filters = {
      sort: sort ?? "newest"
    };
    if (isIssueType(type)) {
      filters.type = type;
    }
    if (isIssueStatus(status)) {
      filters.status = status;
    }
    const issues = await getAllIssues(filters);
    res.status(200).json({
      success: true,
      message: "Issues retrieved successfully",
      data: issues
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var getIssueHandler = async (req, res) => {
  try {
    const id = parseIssueId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid issue id" });
      return;
    }
    const issue = await getIssueById(id);
    if (!issue) {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Issue retrieved successfully",
      data: issue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var updateIssueHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    const id = parseIssueId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid issue id" });
      return;
    }
    const issue = await getIssueEntityById(id);
    if (!issue) {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    const body = req.body;
    if (req.user.role === "contributor") {
      if (issue.reporter_id !== req.user.id) {
        res.status(403).json({ success: false, message: "You can only update your own issue" });
        return;
      }
      if (issue.status !== "open") {
        res.status(409).json({ success: false, message: "Only open issues can be updated by contributors" });
        return;
      }
      if (body.status !== void 0) {
        res.status(403).json({ success: false, message: "Contributors cannot change issue status" });
        return;
      }
    }
    if (body.title !== void 0 && body.title.length > 150) {
      res.status(400).json({ success: false, message: "title must be at most 150 characters" });
      return;
    }
    if (body.description !== void 0 && body.description.length < 20) {
      res.status(400).json({ success: false, message: "description must be at least 20 characters" });
      return;
    }
    if (body.type !== void 0 && !isIssueType(body.type)) {
      res.status(400).json({ success: false, message: "type must be bug or feature_request" });
      return;
    }
    if (body.status !== void 0 && !isIssueStatus(body.status)) {
      res.status(400).json({ success: false, message: "status must be open, in_progress or resolved" });
      return;
    }
    const updatedIssue = await updateIssue(id, body);
    if (!updatedIssue) {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Issue updated successfully",
      data: updatedIssue
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var deleteIssueHandler = async (req, res) => {
  try {
    const id = parseIssueId(req.params.id);
    if (!id) {
      res.status(400).json({ success: false, message: "Invalid issue id" });
      return;
    }
    const deletedRows = await deleteIssue(id);
    if (deletedRows === 0) {
      res.status(404).json({ success: false, message: "Issue not found" });
      return;
    }
    res.status(200).json({
      success: true,
      message: "Issue deleted successfully",
      data: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var issuesController = {
  createIssueHandler,
  getIssuesHandler,
  getIssueHandler,
  updateIssueHandler,
  deleteIssueHandler
};

// src/modules/issues/issues.route.ts
var router2 = Router2();
router2.post("/", authenticate, issuesController.createIssueHandler);
router2.get("/", issuesController.getIssuesHandler);
router2.get("/:id", issuesController.getIssueHandler);
router2.patch("/:id", authenticate, issuesController.updateIssueHandler);
router2.delete("/:id", authenticate, requireRole("maintainer"), issuesController.deleteIssueHandler);
var issuesRoute = router2;

// src/modules/metrics/metrics.route.ts
import { Router as Router3 } from "express";

// src/modules/metrics/metrics.service.ts
var metricsService = {
  getSystemMetrics
};

// src/modules/metrics/metrics.controller.ts
var getMetricsHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Unauthorized access" });
      return;
    }
    if (req.user.role !== "maintainer") {
      res.status(403).json({ success: false, message: "Maintainer access required" });
      return;
    }
    const metrics = await metricsService.getSystemMetrics();
    res.status(200).json({
      success: true,
      message: "System metrics retrieved successfully",
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      errors: error
    });
  }
};
var metricsController = {
  getMetricsHandler
};

// src/modules/metrics/metrics.route.ts
var router3 = Router3();
router3.get("/", authenticate, requireRole("maintainer"), metricsController.getMetricsHandler);
var metricsRoute = router3;

// src/middleware/error.middleware.ts
import { StatusCodes } from "http-status-codes";

// src/utils/response.ts
var sendError = (res, statusCode, message, errors) => {
  return res.status(statusCode).json({
    success: false,
    message,
    errors
  });
};

// src/middleware/error.middleware.ts
var isDatabaseError = (error) => {
  return typeof error === "object" && error !== null && "code" in error;
};
var notFound = (_req, res) => {
  return sendError(res, StatusCodes.NOT_FOUND, "Route not found");
};
var errorHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    return sendError(res, error.statusCode, error.message, error.errors);
  }
  if (isDatabaseError(error)) {
    if (error.code === "23505") {
      return sendError(res, StatusCodes.CONFLICT, "Duplicate resource", error.detail);
    }
    if (error.code === "23503") {
      return sendError(res, StatusCodes.BAD_REQUEST, "Referenced resource does not exist", error.detail);
    }
  }
  const message = error instanceof Error ? error.message : "Internal Server Error";
  return sendError(res, StatusCodes.INTERNAL_SERVER_ERROR, message, error);
};

// src/app.ts
var app = express();
app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
app.get("/", (_req, res) => {
  res.status(200).json({
    message: "DevPulse Server",
    author: "DevPulse Team"
  });
});
app.use("/api/auth", authRoute);
app.use("/api/issues", issuesRoute);
app.use("/api/metrics", metricsRoute);
app.use(notFound);
app.use(errorHandler);
var app_default = app;

// src/server.ts
var main = async () => {
  await initDB();
  if (!process.env.VERCEL) {
    app_default.listen(config_default.port, () => {
      console.log(` DevPulse app listening on port ${config_default.port}`);
    });
  }
};
void main();
var server_default = app_default;
export {
  server_default as default
};
//# sourceMappingURL=server.js.map