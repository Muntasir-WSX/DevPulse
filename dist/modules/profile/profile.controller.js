import { profileService } from "./profile.service";
const createProfile = async (req, res) => {
    const { user_id, bio, address, phone, gender } = req.body;
    const parsedUserId = Number(user_id);
    if (!user_id || Number.isNaN(parsedUserId)) {
        res.status(400).json({
            success: false,
            message: "user_id is required and must be a number",
        });
        return;
    }
    try {
        const result = await profileService.createProfileIntoDB({
            user_id: parsedUserId,
            bio,
            address,
            phone,
            gender,
        });
        res.status(201).json({
            success: true,
            message: "Profile created successfully!",
            data: result.rows[0],
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message,
            error: error,
        });
    }
};
export const profileController = {
    createProfile
};
//# sourceMappingURL=profile.controller.js.map