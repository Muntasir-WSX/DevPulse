import { Router } from "express";
import { profileController } from "./profile.controller";

const router = Router()

router.get("/", (_req, res) => {
	res.status(200).json({
		success: true,
		message: "Profile route is alive. Use POST to create a profile.",
	});
});

router.post ("/", profileController.createProfile); 


export const profileRoute = router;