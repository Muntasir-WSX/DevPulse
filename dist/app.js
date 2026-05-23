import express, {} from "express";
import config from "./config";
import { initDB, pool } from "./db";
import { userRoute } from "./modules/users/user.route";
import { profileRoute } from "./modules/profile/profile.route";
const app = express();
const port = config.port;
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));
//  initDB();
app.get("/", (req, res) => {
    res.status(200).json({
        message: "DevPulse Server",
        author: "DevPulse Team",
    });
});
app.use("/api/users", userRoute);
app.use("/api/profile", profileRoute);
export default app;
//# sourceMappingURL=app.js.map