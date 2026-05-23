import { pool } from "../../db";
const createProfileIntoDB = async (payload) => {
    const { user_id, bio, address, phone, gender } = payload;
    const result = await pool.query(`
            INSERT INTO profiles(user_id, bio, address, phone, gender)
            VALUES($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, bio || null, address || null, phone || null, gender || null]);
    return result;
};
export const profileService = {
    createProfileIntoDB
};
//# sourceMappingURL=profile.service.js.map