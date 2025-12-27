import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { formatError, handlePrismaError } from "./helper.js";
import { sendResponse } from "./ApiResponse.js";
import logger from "../config/logger.js";
import {
    PrismaClientKnownRequestError,
    PrismaClientUnknownRequestError,
    PrismaClientRustPanicError,
    PrismaClientInitializationError,
    PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import jwt from "jsonwebtoken";

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction,
) => Promise<any>;

const asyncHandler = (fn: AsyncRequestHandler) => {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            await fn(req, res, next);
        } catch (error) {
            // Enhanced error logging
            logger.error("Request processing error", {
                error: {
                    name: error instanceof Error ? error.name : "Unknown",
                    message:
                        error instanceof Error ? error.message : String(error),
                    stack: error instanceof Error ? error.stack : undefined,
                    code: (error as any)?.code,
                    meta: (error as any)?.meta,
                },
                request: {
                    path: req.path,
                    method: req.method,
                    query: req.query,
                    params: req.params,
                    body: req.method !== "GET" ? req.body : undefined,
                    headers: {
                        "user-agent": req.get("user-agent"),
                        "content-type": req.get("content-type"),
                    },
                },
                timestamp: new Date().toISOString(),
            });

            // Handle different error types
            if (error instanceof ZodError) {
                const errors = formatError(error);
                return sendResponse(res, 422, null, "Validation Error", errors);
            }

            // Enhanced Prisma error handling
            if (
                error instanceof PrismaClientKnownRequestError ||
                error instanceof PrismaClientUnknownRequestError ||
                error instanceof PrismaClientRustPanicError ||
                error instanceof PrismaClientInitializationError ||
                error instanceof PrismaClientValidationError
            ) {
                const prismaError = handlePrismaError(error);
                return sendResponse(
                    res,
                    prismaError.statusCode,
                    null,
                    prismaError.message,
                    prismaError.details,
                );
            }

            if (error instanceof jwt.JsonWebTokenError) {
                return sendResponse(res, 401, null, "Unauthorized", [
                    "Invalid token. Please login again.",
                ]);
            }

            if (error instanceof jwt.TokenExpiredError) {
                return sendResponse(res, 401, null, "Token Expired", [
                    "Your session has expired. Please login again.",
                ]);
            }

            if (error instanceof jwt.NotBeforeError) {
                return sendResponse(res, 401, null, "Token Not Active", [
                    "Token is not active yet.",
                ]);
            }

            // Generic error handling
            const statusCode =
                (error as any)?.statusCode || (error as any)?.status || 500;
            const message =
                error instanceof Error ? error.message : String(error);

            return sendResponse(
                res,
                statusCode,
                null,
                statusCode >= 500 ? "Internal Server Error" : "Request Failed",
                [{ message }],
            );
        }
    };
};

export default asyncHandler;
