import { pool } from "../../db";
const createUserIntoDB = async (payload) => {
    const { name, email, password, age } = payload;
    const result = await pool.query(`
      INSERT INTO users(name, email, password, age) VALUES($1, $2, $3, $4) RETURNING *
      `, [name, email, password, age || null]);
    return result;
};
const getAllUsersFromDB = async () => {
    const result = await pool.query(`
      SELECT id, name, email, is_active, age, created_at, updated_at FROM users  
    `);
    return result;
};
const getUserById = async (id) => {
    const result = await pool.query(`
      SELECT * FROM users WHERE id=$1  
        `, [id]);
    return result;
};
const updateuserById = async (payload, id) => {
    const { name, password, age, is_active } = payload;
    const result = await pool.query(`
    UPDATE users 
    SET 
    name=COALESCE($1,name),
    password=COALESCE($2,password),
    age=COALESCE($3,age),
    is_active=COALESCE($4,is_active) 

    WHERE id=$5 RETURNING *
    `, [name, password, age, is_active, id]);
    return result;
};
const deleteUserById = async (id) => {
    const result = await pool.query(`
    DELETE FROM users WHERE id=$1  
      `, [id]);
    return result;
};
export const userService = {
    createUserIntoDB,
    getAllUsersFromDB,
    getUserById,
    updateuserById,
    deleteUserById
};
//# sourceMappingURL=user.service.js.map