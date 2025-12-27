import bcrypt from "bcryptjs";
import ejs from "ejs";
import jwt, { SignOptions } from "jsonwebtoken";
import moment from "moment";
import { v4 as uuidv4 } from "uuid";
import { number, z, ZodError } from "zod";
import { __dirname } from "../app.js";
import path from "path";
import { sendEmail } from "../config/mail.js";
import { UploadedFile } from "express-fileupload";
import { imageValidator, uploadImage } from "./fileupload.js";
import crypto from "crypto";
import {
    PrismaClientInitializationError,
    PrismaClientKnownRequestError,
    PrismaClientRustPanicError,
    PrismaClientUnknownRequestError,
    PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { JWT_SECRET } from "../constants/constant.js";

// CONSTANTS
const SALT_ROUNDS = 10;
const EXPIRES_IN = "1d";

type OtpValidationResult = {
    isValid: boolean;
    errorType?: "expired" | "invalid";
};

// FUNCTION
export const formatError = (error: ZodError): any => {
    let errors: any = {};
    error.errors?.map((issue) => {
        errors[issue.path[0]] = issue.message;
    });
    return errors;
};

export const generateRandomNum = () => {
    return uuidv4();
};

// Function to generate an OTP
export const generateOTP = (length: number): string => {
    let otp = "";
    const characters = "0123456789";
    for (let i = 0; i < length; i++) {
        otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return otp;
};

export const unlockedItems: {
    id: string;
    forId: string;
    forWhomId: string;
    validTill: Date;
}[] = [];

setInterval(
    () => {
        const now = new Date();
        for (let i = unlockedItems.length - 1; i >= 0; i--) {
            if (unlockedItems[i].validTill < now) {
                unlockedItems.splice(i, 1); // remove expired item
            }
        }
    },
    5 * 60 * 1000,
);

export const renderEmailEjs = async (fileName: string, payload: any) => {
    const html = await ejs.renderFile(
        __dirname + `/views/emails/${fileName}.ejs`,
        payload,
    );
    return html;
};

export const renderTemplate = async (
    templateName: string,
    user: object,
): Promise<string> => {
    try {
        // Validate inputs
        if (!templateName || typeof templateName !== "string") {
            throw new Error("Invalid template name provided.");
        }
        if (!user || typeof user !== "object") {
            throw new Error("Invalid user data provided.");
        }

        // console.log("Rendering template:", templateName);
        // console.log("Template data:", user);

        // Construct the file path
        const filePath = path.join(
            __dirname,
            "views/emails",
            `${templateName}.ejs`,
        );
        // console.log("Template file path:", filePath);
        // Render the template
        return await ejs.renderFile(filePath, user);
    } catch (error) {
        const errorMessage = (error as Error).message;

        // Log error with context
        console.error(
            `Error rendering EJS template '${templateName}':`,
            errorMessage,
        );

        // Graceful fallback
        const fallbackMessage = `<p>Dear User, we encountered an issue processing your request. Please try again later.</p>`;
        return fallbackMessage; // Or consider throwing a specific error if needed
    }
};

export const checkDateHourDifference = (date: Date | string): number => {
    const now = moment();
    const tokenSentAt = moment(date);
    const difference = moment.duration(now.diff(tokenSentAt));
    const hoursDiff = difference.asHours();
    return hoursDiff;
};

export const isOtpValid = (
    providedOtp: string,
    storedOtp: string | null,
    expiresAt: Date | null,
): OtpValidationResult => {
    if (!storedOtp || !expiresAt) {
        return { isValid: false, errorType: "invalid" }; // If no OTP or expiration, consider it invalid
    }
    const now = new Date();
    const isOtpExpired = now > expiresAt;
    const isOtpCorrect = Number(providedOtp) === Number(storedOtp);

    if (!isOtpCorrect) {
        return { isValid: false, errorType: "invalid" }; // Invalid OTP
    }
    if (isOtpExpired) {
        return { isValid: false, errorType: "expired" }; // Expired OTP
    }
    return { isValid: true }; // OTP is valid
};

// Function to hash a password
export const hashPassword = async (password: string) => {
    const saltRounds = SALT_ROUNDS;
    return await bcrypt.hash(password, saltRounds);
};

export const formatDate = (dateStr: string) =>
    new Date(dateStr)
        .toLocaleString("en-US", {
            month: "short",
            year: "2-digit",
        })
        .toUpperCase()
        .replace(" ", "");
// Function to compare a password with a hashed password
export const comparePasswords = async (password: string, hash: string) => {
    return await bcrypt.compare(password, hash);
};

// Function to generate a JWT
export const generateToken = (payload: string | object | Buffer): string => {
    return jwt.sign(
        payload,
        JWT_SECRET as jwt.Secret,
        { expiresIn: EXPIRES_IN } as SignOptions,
    );
};

// Function to verify a JWT
export const verifyToken = (token: string): any => {
    return jwt.verify(token, JWT_SECRET as jwt.Secret);
};

// FUnction to Generate a random Client Password
export const generateRandomPassword = (length: number): string => {
    const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength),
        );
    }
    return result;
};

export const sendPasswordResetEmail = async (
    email: string,
    token: string,
    name: string,
) => {
    try {
        const html = await renderTemplate("reset-password", {
            userName: name,
            resetLink: `${process.env.CLIENT_URL}/reset-password/${token}`,
        });
        const response = await sendEmail(
            email,
            "Password Reset Link || VakilGIRI",
            html,
        );

        return response;
    } catch (e) {
        console.log(e);
    }
};

export const sendPasswordComfirmationEmail = async (
    email: string,
    name: string,
) => {
    try {
        const html = await renderTemplate("password-reset-success", {
            userName: name,
        });
        await sendEmail(email, "VakilGIRI", html);
    } catch (error) {
        console.log(error);
    }
};

export const getEmail = (token: string) => {
    const { email } = verifyToken(token);
    return email;
};

const emailVerificationSchema = z.object({
    email: z.string().email("Invalid email address provided."),
    name: z.string().min(1, "Name must not be empty."),
});
export const sendEmailVerification = async (
    email: string,
    name: string,
): Promise<void> => {
    try {
        // Validate inputs using zod
        emailVerificationSchema.parse({ email, name });

        console.log(
            `Preparing to send email verification to: ${email}, Name: ${name}`,
        );

        // Render the email template
        const html = await renderTemplate("verifed-email", { userName: name });

        // Send the email
        const response = await sendEmail(
            email,
            "VakilGIRI | Email Verification",
            html,
        );
        console.log(`Email verification sent successfully to: ${email}`);
    } catch (error) {
        if (error instanceof z.ZodError) {
            // Handle validation errors
            console.error("Validation failed:", error.errors);
        } else {
            // Handle other errors
            console.error(
                `Failed to send email verification to ${email}:`,
                (error as Error).message,
            );
        }
    }
};

export const uploadFile = async (file: UploadedFile) => {
    const image = file;
    const imageValidationError = imageValidator(image.size, image.mimetype);
    if (imageValidationError) {
        return null;
    }
    const imageName = await uploadImage(image);
    return imageName;
};

export const generateReceiptNumber = () => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 7);
    return `RCPT-${timestamp}-${randomStr}`.toUpperCase();
};

export const truncateToDecimals = (number: number, decimals: number) => {
    const decimalSeparator = ".";
    const numStr = number.toString();
    const parts = numStr.split(decimalSeparator);

    // If no decimal part or already shorter, return as is
    if (parts.length === 1 || parts[1].length <= decimals) {
        return number;
    }

    // Take only the digits we want by substring
    return Number(
        parts[0] + decimalSeparator + parts[1].substring(0, decimals),
    );
};
export const toFixed = (number: number, decimals: number = 2) => {
    return Number(number.toFixed(decimals));
};
interface PrismaErrorResponse {
    statusCode: number;
    message: string;
    details?: string[];
}
export const handlePrismaError = (error: any): PrismaErrorResponse => {
    if (error instanceof PrismaClientKnownRequestError) {
        switch (error.code) {
            case "P2000":
                return {
                    statusCode: 400,
                    message: "Input value is too long for the field",
                    details: [
                        error.meta?.target
                            ? `Field: ${error.meta.target}`
                            : error.message,
                    ],
                };

            case "P2001":
                return {
                    statusCode: 404,
                    message: "Record not found",
                    details: ["The requested record does not exist"],
                };

            case "P2002":
                return {
                    statusCode: 409,
                    message: "Unique constraint violation || priority conflict",
                    details: [
                        error.meta?.target
                            ? `Duplicate value for: ${Array.isArray(error.meta.target) ? error.meta.target.join(", ") : error.meta.target}`
                            : "A record with this value already exists",
                    ],
                };

            case "P2003":
                return {
                    statusCode: 400,
                    message: "Foreign key constraint violation",
                    details: [
                        error.meta?.field_name
                            ? `Invalid reference in field: ${error.meta.field_name}`
                            : "Referenced record does not exist",
                    ],
                };

            case "P2004":
                return {
                    statusCode: 400,
                    message: "Database constraint violation",
                    details: [error.message],
                };

            case "P2005":
                return {
                    statusCode: 400,
                    message: "Invalid field value",
                    details: [
                        error.meta?.field_value
                            ? `Invalid value: ${error.meta.field_value} for field: ${error.meta.field_name}`
                            : error.message,
                    ],
                };

            case "P2006":
                return {
                    statusCode: 400,
                    message: "Invalid field value for model",
                    details: [error.message],
                };

            case "P2007":
                return {
                    statusCode: 400,
                    message: "Data validation error",
                    details: [error.message],
                };

            case "P2008":
                return {
                    statusCode: 400,
                    message: "Failed to parse query",
                    details: [error.message],
                };

            case "P2009":
                return {
                    statusCode: 400,
                    message: "Failed to validate query",
                    details: [error.message],
                };

            case "P2010":
                return {
                    statusCode: 500,
                    message: "Raw query failed",
                    details: ["Database query execution failed"],
                };

            case "P2011":
                return {
                    statusCode: 400,
                    message: "Null constraint violation",
                    details: [
                        error.meta?.target
                            ? `Required field missing: ${error.meta.target}`
                            : "Required field cannot be null",
                    ],
                };

            case "P2012":
                return {
                    statusCode: 400,
                    message: "Missing required value",
                    details: [
                        error.meta?.path
                            ? `Missing value for: ${error.meta.path}`
                            : error.message,
                    ],
                };

            case "P2013":
                return {
                    statusCode: 400,
                    message: "Missing required argument",
                    details: [
                        error.meta?.argument_name
                            ? `Missing argument: ${error.meta.argument_name} for field: ${error.meta.field_name}`
                            : error.message,
                    ],
                };

            case "P2014":
                return {
                    statusCode: 400,
                    message: "Required relation violation",
                    details: [
                        error.meta?.relation_name
                            ? `Required relation missing: ${error.meta.relation_name}`
                            : "Required relation is missing",
                    ],
                };

            case "P2016":
                return {
                    statusCode: 400,
                    message: "Query interpretation error",
                    details: [error.message],
                };

            case "P2017":
                return {
                    statusCode: 400,
                    message: "Records not connected",
                    details: [
                        error.meta?.relation_name
                            ? `Records not connected through relation: ${error.meta.relation_name}`
                            : "Related records are not properly connected",
                    ],
                };

            case "P2018":
                return {
                    statusCode: 404,
                    message: "Required connected records not found",
                    details: [error.message],
                };

            case "P2019":
                return {
                    statusCode: 400,
                    message: "Input error",
                    details: [error.message],
                };

            case "P2020":
                return {
                    statusCode: 400,
                    message: "Value out of range",
                    details: [error.message],
                };

            case "P2021":
                return {
                    statusCode: 404,
                    message: "Table does not exist",
                    details: [
                        error.meta?.table
                            ? `Table '${error.meta.table}' does not exist in database`
                            : "Referenced table does not exist",
                    ],
                };

            case "P2022":
                return {
                    statusCode: 404,
                    message: "Column does not exist",
                    details: [
                        error.meta?.column
                            ? `Column '${error.meta.column}' does not exist`
                            : "Referenced column does not exist",
                    ],
                };

            case "P2023":
                return {
                    statusCode: 500,
                    message: "Inconsistent column data",
                    details: [error.message],
                };

            case "P2024":
                return {
                    statusCode: 408,
                    message: "Connection timeout",
                    details: ["Database connection timed out"],
                };

            case "P2025":
                return {
                    statusCode: 404,
                    message: "Record not found for operation",
                    details: [
                        error.meta?.cause
                            ? `Record to ${error.meta.cause} does not exist`
                            : "Record required for operation was not found",
                    ],
                };

            case "P2026":
                return {
                    statusCode: 400,
                    message: "Unsupported feature",
                    details: [error.message],
                };

            case "P2027":
                return {
                    statusCode: 500,
                    message: "Multiple database errors",
                    details: [error.message],
                };

            case "P2028":
                return {
                    statusCode: 500,
                    message: "Transaction API error",
                    details: [error.message],
                };

            case "P2030":
                return {
                    statusCode: 404,
                    message: "Fulltext index not found",
                    details: [error.message],
                };

            case "P2031":
                return {
                    statusCode: 500,
                    message: "MongoDB replica set required",
                    details: ["MongoDB operations require a replica set"],
                };

            case "P2033":
                return {
                    statusCode: 400,
                    message: "Number out of range",
                    details: [error.message],
                };

            case "P2034":
                return {
                    statusCode: 409,
                    message: "Transaction conflict",
                    details: [
                        "Write conflict detected - please retry the operation",
                    ],
                };

            default:
                return {
                    statusCode: 500,
                    message: "Database operation failed",
                    details: [
                        `Database error code: ${error.code}`,
                        error.message,
                    ],
                };
        }
    }

    if (error instanceof PrismaClientUnknownRequestError) {
        return {
            statusCode: 500,
            message: "Unknown database error",
            details: [error.message],
        };
    }

    if (error instanceof PrismaClientRustPanicError) {
        return {
            statusCode: 500,
            message: "Database engine error",
            details: ["Internal database engine error occurred"],
        };
    }

    if (error instanceof PrismaClientInitializationError) {
        return {
            statusCode: 503,
            message: "Database connection failed",
            details: ["Unable to establish database connection"],
        };
    }

    if (error instanceof PrismaClientValidationError) {
        return {
            statusCode: 400,
            message: "Database query validation failed",
            details: [error.message],
        };
    }

    // Fallback for other Prisma errors
    return {
        statusCode: 500,
        message: "Database error",
        details: [error.message || "An unknown database error occurred"],
    };
};
