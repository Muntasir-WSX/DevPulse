import cors from "cors";
import express, { type Application, type Request, type Response } from "express";
import { authRoute } from "./modules/auth/auth.route";
import { issuesRoute } from "./modules/issues/issues.route";
import { metricsRoute } from "./modules/metrics/metrics.route";
import { profileRoute } from "./modules/profile/profile.route";
import { errorHandler, notFound } from "./middleware/error.middleware";

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    message: "DevPulse Server",
    author: "DevPulse Team",
  });
});

app.use("/api/auth", authRoute);
app.use("/api/issues", issuesRoute);
app.use("/api/metrics", metricsRoute);
app.use("/api/profile", profileRoute);

app.use(notFound);
app.use(errorHandler);

export default app;
