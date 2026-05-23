import dotenv from "dotenv";
import path from "path";
dotenv.config({
    path: path.join(process.cwd(), ".env"),
});
const fallbackNeon = "postgresql://neondb_owner:npg_B2lE8zAGIaeg@ep-twilight-star-aq8pmibs-pooler.c-8.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const config = {
    connection_string: (process.env.DATABASE_URL || process.env.CONNECTIONSTRING || fallbackNeon),
    port: process.env.PORT || "5000",
};
export default config;
//# sourceMappingURL=index.js.map