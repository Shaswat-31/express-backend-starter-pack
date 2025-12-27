import { Request } from "express";
import winston, { format } from "winston";
const { combine, timestamp, json } = format;

const logger = winston.createLogger({
    level: "",
    format: combine(timestamp(), json()),
    transports: [new winston.transports.File({ filename: "logs.log" })],
});

const infoLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => {
            return `${timestamp} [${level}]: ${message}`;
        }),
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: "combined.log" }),
    ],
});
const logWithIp = (req: Request, message: string) => {
    const ipAddress =
        req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    infoLogger.info(`${message} - IP: ${ipAddress}`);
};
export { logWithIp, infoLogger };
export default logger;
