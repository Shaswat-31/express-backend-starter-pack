import { fileSupportedMines, supportedMimes } from "../config/filesystem.js";
// import fs from "fs";
import { generateRandomNum } from "./helper.js";
import { UploadedFile } from "express-fileupload";
// import path from "path";
import sharp from "sharp";
import * as fs from "fs";
import * as path from "path";
import { exec } from "child_process";

// image validator
export const imageValidator = (size: number, mime: string) => {
    if (bytesToMb(size) > 200) {
        return "Image size must be less than 200 MB";
    } else if (!supportedMimes.includes(mime)) {
        return "Image must be type of png,jpg,jpeg,svg,webp,gif..";
    }
    return null;
};

// file validator
export const fileValidator = (
    size: number,
    mime: string,
    maxSizeMb: number = 200,
) => {
    if (bytesToMb(size) > maxSizeMb) {
        return `File size must be less than ${maxSizeMb} MB`;
    } else if (!fileSupportedMines.includes(mime)) {
        return `File type not supported. Allowed types: ${fileSupportedMines.join(", ")}`;
    }
    return null;
};

// bytes to mb
export const bytesToMb = (bytes: number) => {
    return bytes / (1024 * 1024);
};

// remove image

export const uploadImage = async (image: UploadedFile) => {
    const imagesDir = path.join(process.cwd(), "public", "images");

    // Create the directory if it doesn't exist
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const uploadPath = path.join(imagesDir, image.name);

    // Move the file
    await new Promise<void>((resolve, reject) => {
        image.mv(uploadPath, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    return image.name;
};

export const uploadDoc = async (image: UploadedFile) => {
    const imagesDir = path.join(process.cwd(), "public", "doc");

    // Create the directory if it doesn't exist
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
    }

    const uploadPath = path.join(imagesDir, image.name);

    // Move the file
    await new Promise<void>((resolve, reject) => {
        image.mv(uploadPath, (err) => {
            if (err) return reject(err);
            resolve();
        });
    });

    return image.name;
};


export interface uploadReturnType {
    name: string;
    size: number;
}

// Function to delete file using Windows DEL command
function deleteFileWithDEL(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
        // Use Windows DEL command which can sometimes handle locked files better
        const escapedPath = filePath.replace(/\\/g, "\\\\");
        exec(`DEL /F "${escapedPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.warn(
                    `DEL command failed for ${filePath}: ${error.message}`,
                );
                // Try to move the file to temp folder instead
                const tempFolder = path.join(process.cwd(), "temp_to_delete");

                // Create temp folder if it doesn't exist
                if (!fs.existsSync(tempFolder)) {
                    try {
                        fs.mkdirSync(tempFolder, { recursive: true });
                    } catch (mkdirErr: any) {
                        console.warn(
                            `Failed to create temp folder: ${mkdirErr.message}`,
                        );
                        reject(mkdirErr);
                        return;
                    }
                }

                const tempPath = path.join(
                    tempFolder,
                    `to_delete_${Date.now()}_${path.basename(filePath)}`,
                );

                try {
                    // Attempt to move the file instead of deleting
                    fs.renameSync(filePath, tempPath);
                    console.log(`Moved file to temp location: ${tempPath}`);
                    resolve();
                } catch (moveErr: any) {
                    console.warn(
                        `Failed to move file: ${moveErr.message || moveErr}`,
                    );
                    reject(moveErr);
                }
            } else {
                console.log(
                    `Successfully deleted file with DEL command: ${filePath}`,
                );
                resolve();
            }
        });
    });
}

// Create a scheduled cleanup for the temp folder

// fetch back to local
export const fetchImageIfNotExists = async (
    fileName: string,
    uploadPath: string,
): Promise<string | null> => {
    const localImagePath = path.join(
        process.cwd(),
        "/public/images/",
        fileName,
    );
    const remoteImagePath = `${uploadPath}/${fileName}`;

    if (fs.existsSync(localImagePath)) {
        return localImagePath;
    }

    try {
        // const files = await sftp.listFiles(uploadPath);
        let files:any=[];
        if (!files?.some((file:any) => file.name === fileName)) {
            return null;
        }

        // await sftp.downloadFile(remoteImagePath, localImagePath);
        return localImagePath;
    } catch (error) {
        console.error("Error fetching file from SFTP", error);
        return null;
    }
};

// upload File
export const uploadFile = async (file: UploadedFile) => {
    const isFileValid = fileValidator(file.size, file.mimetype);
    if (isFileValid) return false;
    const fileExt = file?.name.split(".");
    const fileName = generateRandomNum() + "." + fileExt[fileExt.length - 1];
    const uploadPath = process.cwd() + "/public/images/" + fileName;
    file.mv(uploadPath, (err) => {
        if (err) throw err;
    });
    return fileName;
};

export const getFileURL = (fileName: string) => {
    return process.cwd() + "/public/images/" + fileName;
};

export async function compressImage(inputPath: string, outputPath: string) {
    await sharp(inputPath)
        .resize(800) // Resize (optional)
        .webp({ quality: 70 }) // Adjust quality (70% compression)
        .toFile(outputPath);
}
