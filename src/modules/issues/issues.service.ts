import { pool } from "../../db";
import { AppError } from "../../utils/appError";
import type {
  CreateIssueInput,
  IssueRecord,
  IssueReporter,
  IssueResponse,
  IssueStatus,
  IssueType,
  UpdateIssueInput,
} from "./issues.interface";

interface IssueFilters {
  sort?: "newest" | "oldest";
  type?: IssueType;
  status?: IssueStatus;
}

const ISSUE_FIELDS = "id, title, description, type, status, reporter_id, created_at, updated_at";

const buildReporterMap = async (reporterIds: number[]): Promise<Map<number, IssueReporter>> => {
  if (reporterIds.length === 0) {
    return new Map();
  }

  const result = await pool.query<IssueReporter>(
    `SELECT id, name, role FROM users WHERE id = ANY($1::int[])`,
    [reporterIds]
  );

  return new Map(result.rows.map((reporter) => [reporter.id, reporter]));
};

const convertIssues = async (issues: IssueRecord[]): Promise<IssueResponse[]> => {
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
      updated_at: issue.updated_at,
    };
  });
};

export const createIssue = async (
  payload: CreateIssueInput,
  reporterId: number
): Promise<IssueRecord> => {
  const result = await pool.query<IssueRecord>(
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

export const getAllIssues = async (filters: IssueFilters): Promise<IssueResponse[]> => {
  const conditions: string[] = [];
  const values: Array<string | number> = [];

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
  const result = await pool.query<IssueRecord>(query, values);

  return convertIssues(result.rows);
};

export const getIssueById = async (id: number): Promise<IssueResponse | null> => {
  const result = await pool.query<IssueRecord>(
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

export const getIssueEntityById = async (id: number): Promise<IssueRecord | null> => {
  const result = await pool.query<IssueRecord>(
    `SELECT ${ISSUE_FIELDS} FROM issues WHERE id = $1 LIMIT 1`,
    [id]
  );

  return result.rows[0] ?? null;
};

export const updateIssue = async (
  id: number,
  payload: UpdateIssueInput
): Promise<IssueRecord | null> => {
  const values: Array<string | number> = [];
  const updates: string[] = [];

  if (payload.title !== undefined) {
    values.push(payload.title);
    updates.push(`title = $${values.length}`);
  }

  if (payload.description !== undefined) {
    values.push(payload.description);
    updates.push(`description = $${values.length}`);
  }

  if (payload.type !== undefined) {
    values.push(payload.type);
    updates.push(`type = $${values.length}`);
  }

  if (payload.status !== undefined) {
    values.push(payload.status);
    updates.push(`status = $${values.length}`);
  }

  if (updates.length === 0) {
    throw new AppError(400, "At least one field is required to update the issue");
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `UPDATE issues SET ${updates.join(", ")} WHERE id = $${values.length} RETURNING ${ISSUE_FIELDS}`;
  const result = await pool.query<IssueRecord>(query, values);

  return result.rows[0] ?? null;
};

export const deleteIssue = async (id: number): Promise<number> => {
  const result = await pool.query(`DELETE FROM issues WHERE id = $1`, [id]);
  return result.rowCount ?? 0;
};

export const getSystemMetrics = async (): Promise<Record<string, number>> => {
  const [usersResult, issuesResult, openResult, inProgressResult, resolvedResult, bugResult, featureResult] =
    await Promise.all([
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'open'`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'in_progress'`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues WHERE status = 'resolved'`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues WHERE type = 'bug'`),
      pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM issues WHERE type = 'feature_request'`),
    ]);

  return {
    total_users: Number(usersResult.rows[0]?.count ?? 0),
    total_issues: Number(issuesResult.rows[0]?.count ?? 0),
    open_issues: Number(openResult.rows[0]?.count ?? 0),
    in_progress_issues: Number(inProgressResult.rows[0]?.count ?? 0),
    resolved_issues: Number(resolvedResult.rows[0]?.count ?? 0),
    bug_issues: Number(bugResult.rows[0]?.count ?? 0),
    feature_request_issues: Number(featureResult.rows[0]?.count ?? 0),
  };
};