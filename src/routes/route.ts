import type { IncomingMessage, ServerResponse } from "http";
import { userCOntroller } from "../controller/user.controller";

export const routeHandler = (req: IncomingMessage, res: ServerResponse) => {
   const url = req.url
    const method = req.method


   if ( url === "/" && method === "GET" ) {
        // console.log("Received a GET request to the root path");

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "Hello, World! This is the root path." }));
    }

else if (url?.startsWith ("/api/users"))
{
   userCOntroller(req,res);
}
  else {
        res.writeHead(404, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ error: "404 Not Found: The requested resource was not found on this server." }));
    }

}