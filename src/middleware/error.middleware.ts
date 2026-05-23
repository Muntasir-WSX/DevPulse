import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { DatabaseError } from "pg";
import { AppError } from "../utils/appError";
import { sendError } from "../utils/response";

const isDatabaseError = (error: unknown): error is DatabaseError => {
  return typeof error === "object" && error !== null && "code" in error;
};

export const notFound = (_req: Request, res: Response): Response => {
  return sendError(res, StatusCodes.NOT_FOUND, "Route not found");
};

export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): Response => {
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