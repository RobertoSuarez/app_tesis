import { NextFunction, Request, Response } from "express";

export const logErrors = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // console.log(err);
    next(err);
}

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    res.status(500).json({
        message: err.message,
        stack: err.stack
    });
}