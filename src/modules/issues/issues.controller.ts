import type { Request, Response } from "express";
import type { CreateIssueInput, IssueStatus, IssueType, UpdateIssueInput } from "./issues.interface";
import {
  createIssue,
  deleteIssue,
  getAllIssues,
  getIssueById,
  getIssueEntityById,
  updateIssue,
} from "./issues.service";

const isIssueType = (value: unknown): value is IssueType => value === "bug" || value === "feature_request";
const isIssueStatus = (value: unknown): value is IssueStatus =>
  value === "open" || value === "in_progress" || value === "resolved";

const parseIssueId = (value: string | string[] | undefined): number | null => {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
};

const createIssueHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const body = req.body as Partial<CreateIssueInput>;

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
        type: body.type,
      },
      req.user.id
    );

    res.status(201).json({
      success: true,
      message: "Issue created successfully",
      data: issue,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

const getIssuesHandler = async (req: Request, res: Response): Promise<void> => {
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

    const filters: {
      sort?: "newest" | "oldest";
      type?: IssueType;
      status?: IssueStatus;
    } = {
      sort: (sort as "newest" | "oldest" | undefined) ?? "newest",
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
      data: issues,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

const getIssueHandler = async (req: Request, res: Response): Promise<void> => {
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
      data: issue,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

const updateIssueHandler = async (req: Request, res: Response): Promise<void> => {
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

    const body = req.body as Partial<UpdateIssueInput>;

    if (req.user.role === "contributor") {
      if (issue.reporter_id !== req.user.id) {
        res.status(403).json({ success: false, message: "You can only update your own issue" });
        return;
      }

      if (issue.status !== "open") {
        res.status(409).json({ success: false, message: "Only open issues can be updated by contributors" });
        return;
      }

      if (body.status !== undefined) {
        res.status(403).json({ success: false, message: "Contributors cannot change issue status" });
        return;
      }
    }

    if (body.title !== undefined && body.title.length > 150) {
      res.status(400).json({ success: false, message: "title must be at most 150 characters" });
      return;
    }

    if (body.description !== undefined && body.description.length < 20) {
      res.status(400).json({ success: false, message: "description must be at least 20 characters" });
      return;
    }

    if (body.type !== undefined && !isIssueType(body.type)) {
      res.status(400).json({ success: false, message: "type must be bug or feature_request" });
      return;
    }

    if (body.status !== undefined && !isIssueStatus(body.status)) {
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
      data: updatedIssue,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

const deleteIssueHandler = async (req: Request, res: Response): Promise<void> => {
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
      data: null,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

export const issuesController = {
  createIssueHandler,
  getIssuesHandler,
  getIssueHandler,
  updateIssueHandler,
  deleteIssueHandler,
};