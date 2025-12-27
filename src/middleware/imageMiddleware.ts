import { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { fetchImageIfNotExists } from "../utils/fileupload.js";
export const imageMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
    const fileName = req.params.filename;
    let filePath = path.join(process.cwd(), "public/images/", fileName);
    const defaultImagePath = path.join(process.cwd(), "public/images/user.png"); // Replace with your default image

    if (!fs.existsSync(filePath)) {
        try {
            const imagePath = await fetchImageIfNotExists(fileName, "logos");
            filePath = imagePath || defaultImagePath; // Assign default if fetching fails
        } catch (error) {
            console.error(
                "Error fetching image, serving default image instead",
                error,
            );
            filePath = defaultImagePath;
        }
    }

    res.sendFile(filePath);
};
