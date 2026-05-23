import type { Request, Response } from "express";
import { loginUserIntoDB, signupUserIntoDB } from "./auth.service";
import type { LoginInput, SignupInput } from "./auth.interface";
import type { UserRole } from "../../utils/jwt";

const isValidRole = (role: unknown): role is UserRole => {
  return role === "contributor" || role === "maintainer";
};

const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<SignupInput>;
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
      role,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: user,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const statusCode = message === "Email already exists" ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error,
    });
  }
};

const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<LoginInput>;

    if (!body.email || !body.password) {
      res.status(400).json({ success: false, message: "email and password are required" });
      return;
    }

    const data = await loginUserIntoDB({
      email: body.email,
      password: body.password,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const statusCode = message === "Invalid email or password" ? 401 : 500;

    res.status(statusCode).json({
      success: false,
      message,
      error,
    });
  }
};

export const authController = {
  signup,
  login,
};