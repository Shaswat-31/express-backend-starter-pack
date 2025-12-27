import { Request } from "express";
import { sendEmail } from "../config/mail.js";
import { generateOTP, renderTemplate } from "./helper.js";
import SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { z } from "zod";

export const otpSendMail = async (email: string, otp: string) => {
    try {
        const htmlContent = await renderTemplate("otp-email", { otp });
        const response = await sendEmail(
            email,
            "Your OTP Code for Verification",
            htmlContent,
        );
        return response;
    } catch (error) {
        console.log(error);
    }
};




