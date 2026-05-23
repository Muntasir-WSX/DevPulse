import type { Iuser } from "./user.interface";
export declare const userService: {
    createUserIntoDB: (payload: Iuser) => Promise<import("pg").QueryResult<any>>;
    getAllUsersFromDB: () => Promise<import("pg").QueryResult<any>>;
    getUserById: (id: string) => Promise<import("pg").QueryResult<any>>;
    updateuserById: (payload: Iuser, id: string) => Promise<import("pg").QueryResult<any>>;
    deleteUserById: (id: string) => Promise<import("pg").QueryResult<any>>;
};
//# sourceMappingURL=user.service.d.ts.map