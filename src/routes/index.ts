import { Router } from "express";
import { v1Router } from "./v1/index.js";
import { authMiddleware } from '../middleware/authMiddleware.js';


const router = Router();

router.use("/v1",authMiddleware,v1Router);

export { router as apiRouter };
