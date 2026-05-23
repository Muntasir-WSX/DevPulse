import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { metricsController } from "./metrics.controller";

const router = Router();

router.get("/", authenticate, requireRole("maintainer"), metricsController.getMetricsHandler);

export const metricsRoute = router;