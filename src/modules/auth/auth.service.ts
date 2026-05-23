import { pool } from "../../db";
import { comparePassword, hashPassword } from "../../utils/password";
import { signAccessToken } from "../../utils/jwt";
import type { AuthUser, LoginInput, SignupInput } from "./auth.interface";

const AUTH_USER_FIELDS = "id, name, email, role, created_at, updated_at";

export const signupUserIntoDB = async (payload: SignupInput): Promise<AuthUser> => {
  const hashedPassword = await hashPassword(payload.password);
  let user: AuthUser | undefined;

  try {
    const result = await pool.query<AuthUser>(
      `
        INSERT INTO users(name, email, password, role)
        VALUES($1, $2, $3, $4)
        RETURNING ${AUTH_USER_FIELDS}
      `,
      [payload.name, payload.email, hashedPassword, payload.role ?? "contributor"]
    );

    user = result.rows[0];
  } catch (error) {
    const dbError = error as { code?: string };

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

export const loginUserIntoDB = async (
  payload: LoginInput
): Promise<{ token: string; user: AuthUser }> => {
  const result = await pool.query<AuthUser & { password: string }>(
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
    role: user.role,
  });

  const { password, ...safeUser } = user;

  return {
    token,
    user: safeUser,
  };
};