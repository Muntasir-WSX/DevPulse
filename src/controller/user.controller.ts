import type { IncomingMessage, ServerResponse } from "http";
import { readUsers, writeUsers } from "../service/user.service";
import type { IUser } from "../type/user.type";
import { parseBody } from "../utility/parseBody";

const generateUserId = (users: IUser[]) => {
    let id = Date.now();

    while (users.some((user: IUser) => user.id === id)) {
        id += 1;
    }

    return id;
};

export const userCOntroller = async (req:IncomingMessage,res:ServerResponse) =>
{

     const url = req.url;
    const method = req.method;


    const urlParts = url?.split("/");
    const id = urlParts && urlParts[2] === 'users' ? Number(urlParts[3]) : null; 

    if ( url === "/api/users" && method === "GET" ){
           
        const Users =  readUsers();
 res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "Welcome to the Users API!",
        data: Users
        }));
    }


    else if ( method === "GET" && id !== null){
        
    const Users =  readUsers();
    const user = Users.find((p : IUser) => p.id === id);

    if (!user){
        res.writeHead(404, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "User not found!", data: null }));
        return;
    }
    res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "Welcome to the Single User API!",
        data: user
        }));
    
    }
    else if (method === "POST" && url === "/api/users"){

        const body = await parseBody (req);
        const users = readUsers();
        const nextId = generateUserId(users);

        const newUser = {
            id : nextId,
            ...body,
        }

        users.push(newUser);
        
        writeUsers(users);
        res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "User created successfully!",
        data: newUser
    }));

    }


    else if (method === "PUT" && id !== null){
        const body = await parseBody (req);
        const users = readUsers();
        const userIndex = users.findIndex((p : IUser) => p.id === id);
        // console.log(userIndex)

        if (userIndex <0 ){
            res.writeHead(404, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "User not found!", data: null }));
        }

        // console.log(users[userIndex])

        users[userIndex] = {id: users[userIndex].id, ...body};
        writeUsers(users);
        res.writeHead(200, {"Content-Type": "application/json"});
    res.end(JSON.stringify({ message: "User updated successfully!", data: users[userIndex] }));


    }

    else if (method === "DELETE" && id !== null){
        const users = readUsers();
        const userIndex = users.findIndex((p : IUser) => p.id === id);
        
  if (userIndex <0 ){
        res.writeHead(404, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "User not found!", data: null }));
    }
    else {
        const deletedUser = users[userIndex];
        users.splice(userIndex, 1);
        writeUsers(users);
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({ message: "User deleted successfully!", data: deletedUser }));
    }
    }
}
