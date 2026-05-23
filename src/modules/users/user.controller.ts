import type { Request, Response } from "express";
import { userService } from "./user.service";

// 1. Create User Controller
const createUser = async (req: Request, res: Response): Promise<void> => {
  const { name, email, password, age } = req.body;

  // Basic server-side validation to avoid DB errors
  if (!name || !email || !password) {
    res.status(400).json({ success: false, message: "name, email and password are required" });
    return;
  }

  if (typeof name === "string" && name.length > 100) {
    res.status(400).json({ success: false, message: "name is too long (max 100)" });
    return;
  }
  if (typeof email === "string" && email.length > 255) {
    res.status(400).json({ success: false, message: "email is too long (max 255)" });
    return;
  }
  if (typeof password === "string" && password.length > 100) {
    res.status(400).json({ success: false, message: "password is too long (max 100)" });
    return;
  }

  try {
    const result = await userService.createUserIntoDB({ name, email, password, age });

    res.status(201).json({
      success: true,
      message: "User Created successfully!",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error: error,
    });
  }
};

// 2. Get All Users Controller
const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
   const result = await userService.getAllUsersFromDB();
    
    res.status(200).json({
      success: true,
      message: "Users retrieved successfully!",
      data: result.rows,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error: error,
    });
  }
};



const getUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    
    const result = await userService.getUserById(id as string);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User Not found!",
        data: {},
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User retrived successfully!",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error: error,
    });
  }
};


const updateUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, password, age, is_active } = req.body;

  try {
   const result = await userService.updateuserById(req.body,id as string);

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "User Not found!",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User updated successfully!",
      data: result.rows[0],
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error: error,
    });
  }
};


const deleteUserById = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
   const result = await userService.deleteUserById(id as string);

    if (result.rowCount === 0) {
      res.status(404).json({
        success: false,
        message: "User Not found!",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully!",
      data: {},
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Internal Server Error",
      error: error,
    });
  }
};

// Exporting Controllers
export const userController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserById,
  deleteUserById
};
    