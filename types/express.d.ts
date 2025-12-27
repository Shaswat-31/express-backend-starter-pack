import { Request } from "express";

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                firstName?: string | null;
                lastName: string | null;
                email: string;
                role:string;
            };
        }
    }
}
console.log("express.d.ts loaded!");
