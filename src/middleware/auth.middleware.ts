import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";

const extractToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  return authorizationHeader.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : authorizationHeader;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = extractToken(req.header("authorization") ?? undefined);

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