import app from "./app";
import config from "./config";
import { initDB } from "./db";

const main = async () => {
  await initDB();
  if (!process.env.VERCEL) {
    app.listen(config.port, () => {
      console.log(` DevPulse app listening on port ${config.port}`);
    });
  }
};

void main();

export default app;