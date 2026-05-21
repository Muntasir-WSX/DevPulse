import type { IncomingMessage, ServerResponse } from "http";
import { readUsers } from "../service/user.service";

export const userCOntroller = async (req:IncomingMessage,res:ServerResponse) =>
{

     const url = req.url
    const method = req.method


    if ( url === "/api/users" && method === "GET" ){
           
        const Users =  readUsers();
 res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "Welcome to the Users API!",
        data: Users
        }));
    }
}