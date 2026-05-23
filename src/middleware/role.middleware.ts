import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../utils/jwt";

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
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