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
        name VARCHAR(100),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        age INT,

        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
        )
            `);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS  profiles (
                id SERIAL PRIMARY KEY,
                user_id INT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                bio TEXT,
                address TEXT,
                phone VARCHAR(50),
                gender VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        // Ensure existing columns are large enough (no-op if already suitable)
        await pool
            .query(`ALTER TABLE users ALTER COLUMN name TYPE VARCHAR(100);`)
            .catch(() => { });
        await pool
            .query(`ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(255);`)
            .catch(() => { });
        await pool
            .query(`ALTER TABLE users ALTER COLUMN password TYPE VARCHAR(100);`)
            .catch(() => { });
        console.log("Database connected successfully!");
    }
    catch (error) {
        console.log(error);
    }
};
//# sourceMappingURL=index.js.map