import { Pool } from "pg";
import config from "../config";

export const pool = new Pool({
  connectionString: config.connection_string,
  ssl: {
    rejectUnauthorized: false,
  },
  connectionTimeoutMillis: 15000,
});

export const initDB = async () => {
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

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'contributor';`).catch(() => {});
    await pool.query(`ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(100);`).catch(() => {});
    await pool.query(`ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);`).catch(() => {});
    await pool.query(`ALTER TABLE users ALTER COLUMN password TYPE TEXT;`).catch(() => {});

    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS title VARCHAR(150);`).catch(() => {});
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS description TEXT;`).catch(() => {});
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS type VARCHAR(20);`).catch(() => {});
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'open';`).catch(() => {});
    await pool.query(`ALTER TABLE issues ADD COLUMN IF NOT EXISTS reporter_id INT;`).catch(() => {});
    await pool.query(`ALTER TABLE issues ALTER COLUMN title TYPE VARCHAR(150);`).catch(() => {});
    await pool.query(`ALTER TABLE issues ALTER COLUMN status SET DEFAULT 'open';`).catch(() => {});

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