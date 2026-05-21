import path from "node:path";
import fs from "node:fs";


const filePath = path.join(process.cwd(), "./src/database/db.json");


export const readUsers = () => {
//  console.log (process.cwd())

const users = fs.readFileSync(filePath, "utf-8");
return JSON.parse(users);
}