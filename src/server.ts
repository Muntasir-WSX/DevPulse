import { createServer, IncomingMessage, Server, ServerResponse } from "http";
import { routeHandler } from "./routes/route";
import config from "./config";

const server : Server = createServer((req : IncomingMessage, res: ServerResponse) => {
 
    const url = req.url
    const method = req.method

 routeHandler(req, res);


    
});


server.listen(config.port, ()=> 
    
    console.log(`Server is running on port ${config.port}`)

);