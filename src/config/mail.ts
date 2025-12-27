import nodemailer from "nodemailer";
import logger from "./logger.js";
import {
    FROM_EMAIL,
    SMTP_HOST,
    SMTP_PASSWORD,
    SMTP_USER,
} from "../constants/constant.js";

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
    },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
    try {
        const response = await transporter.sendMail({
            from: FROM_EMAIL,
            to,
            subject,
            html,
        });
        console.log(response);
        return response;
    } catch (error) {
        console.log(error);
        logger.error({ type: "Email Error", error });
    }
};
