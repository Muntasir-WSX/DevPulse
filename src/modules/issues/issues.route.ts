import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { requireRole } from "../../middleware/role.middleware";
import { issuesController } from "./issues.controller";

const router = Router();

router.post("/", authenticate, issuesController.createIssueHandler);
router.get("/", issuesController.getIssuesHandler);
router.get("/:id", issuesController.getIssueHandler);
router.patch("/:id", authenticate, issuesController.updateIssueHandler);
router.delete("/:id", authenticate, requireRole("maintainer"), issuesController.deleteIssueHandler);

export const issuesRoute = router;