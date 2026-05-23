import jwt from "jsonwebtoken";
import config from "../config";

export type UserRole = "contributor" | "maintainer";

export interface JwtUserPayload {
  id: number;
  name: string;
  role: UserRole;
}

export const signAccessToken = (payload: JwtUserPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): JwtUserPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtUserPayload;
};