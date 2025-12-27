import prisma from "../config/database.js";
import { Request, Response, NextFunction } from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyToken } from "../utils/helper.js";
import { sendResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

export const authMiddleware = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
        const authHeader = req.cookies.authToken || req.headers?.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: Token not provided",
                [],
            );
        }

        const token = authHeader.split(" ")[1];
        const isValid = jwt.decode(token) as jwt.JwtPayload;

        if (!isValid) {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: Token not provided",
                [],
            );
        }
        if (isValid.exp && isValid.exp < Date.now() / 1000) {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: Token expired | Please login again",
                [],
            );
        }

        const decodedToken = verifyToken(token);
        if (!decodedToken) {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: Invalid token",
                [],
            );
        }

        // console.log("decodedToken is: ", decodedToken);

        const user = await prisma.user.findUnique({
            where: { id: decodedToken.id },
        });

        if (!user) {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: User not found",
                [],
            );
        }

        if (user.loginStatus === "Inactive") {
            return sendResponse(
                res,
                401,
                null,
                "Unauthorized access: User Inactive",
                [],
            );
        }
        
        req.user = user;

        next();
        // } catch (error) {
        //     console.error("Authentication error:", error);
        //     return sendResponse(res, 500, null, "Internal server error", []);
        // }
    },
);
