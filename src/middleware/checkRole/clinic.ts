import { Request, Response, NextFunction } from "express";

export const isClinic = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role !== "CLINIC") {
    return res.status(403).json({ message: "Access denied: Clinics only." });
  }
  next();
};
