import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { routeHandler } from "./routes/route";

const server : Server = createServer((req : IncomingMessage, res: ServerResponse) => {
 
    const url = req.url
    const method = req.method

 routeHandler(req, res);


    
});


server.listen(5000, ()=> 
    
    console.log("Server is running on port 5000"

    )
);