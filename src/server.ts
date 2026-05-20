import { createServer, IncomingMessage, Server, ServerResponse } from "http";

const server : Server = createServer((req : IncomingMessage, res: ServerResponse) => {
 
    const url = req.url
    const method = req.method

    if ( url === "/" && method === "GET" ) {
        // console.log("Received a GET request to the root path");

        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "Hello, World! This is the root path." }));
    }

else if (url?.startsWith ("/api/users"))
{
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "Welcome to the Users API!",
            users: [
                { id: 1, name: "Muntasir" },
                { id: 2, name: "Tanjim" }
            ]
        }));
}





    else {
        res.writeHead(404, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ error: "404 Not Found: The requested resource was not found on this server." }));
    }


    
});


server.listen(5000, ()=> 
    
    console.log("Server is running on port 5000"

    )
);