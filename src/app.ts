import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import "dotenv/config";
import express, { Application, Request, Response } from "express";
import ExpressFileUpload from "express-fileupload";
import path from "path";
import { fileURLToPath } from "url";
import { checkDateHourDifference } from "./utils/helper.js";
import dotenv from "dotenv";
import crypto from "crypto";
const PORT = BACKEND_PORT;

// Give local directory path
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

// for setup server
export const app: Application = express();

export const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .filter(Boolean);

// app.use((req, res, next) => {
//     // console.log("🌐 Request Origin:", req.headers.origin);
//     next();
// });

const corsOptions: CorsOptions = {
    origin: (origin, callback) => {
        // console.log("CORS origin:", origin);
        if (origin === "null") {
            callback(null, true);
        } else if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
// app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: false }));
app.use(express.static("public"));
// app.use(limiter);
app.use(
    ExpressFileUpload({
        useTempFiles: true,
        tempFileDir: "/tmp/",
    }),
);
app.use(cookieParser());
// * Set View engine
app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "./views"));

import { sendResponse } from "./utils/ApiResponse.js";
import { imageMiddleware } from "./middleware/imageMiddleware.js";
import { BACKEND_PORT } from "./constants/constant.js";
import { apiRouter } from "./routes/index.js";

app.get("/", async (req: Request, res: Response) => {
    const hoursDiff = checkDateHourDifference("2024-07-15T07:36:28.019Z");
    return res.json({ message: hoursDiff });
});


app.use("/api",apiRouter);


app.get("/images/:filename", imageMiddleware, (req, res) => {
    res.send("Image middleware processed the request.");
});

export const processedEventIds = new Set();


app.all("/*", (req: Request, res: Response) => {
    return sendResponse(res, 404, null, "Route not found", []);
});

app.listen(PORT, () => console.log(`Server is running on PORT ${PORT}`));
