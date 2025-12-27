import { Request, Response, NextFunction } from "express";

export const isPatient = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "PATIENT") {
    return res.status(403).json({ message: "Access denied: Patients only." });
  }
  next();
};
