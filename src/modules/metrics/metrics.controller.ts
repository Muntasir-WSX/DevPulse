import type { Request, Response } from "express";
import { metricsService } from "./metrics.service";

const getMetricsHandler = async (req: Request, res: Response): Promise<void> => {
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
      data: metrics,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error,
    });
  }
};

export const metricsController = {
  getMetricsHandler,
};