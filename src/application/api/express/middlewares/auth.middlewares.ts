import { NextFunction, Request, Response } from "express";
import { verify } from 'jsonwebtoken';
import { config } from "../../../../shared/config/config";


export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {

    const token = req.headers['authorization'];

    if (!token) {

        return res.status(401).json({
            message: 'Unauthorized'
        })
    }

    try {
        const actualToken = token.startsWith('Bearer ') ? token.slice(7, token.length) : token;
        const decoed = verify(actualToken, config.KEY_JWT);
        req['user'] = decoed;
        next();
    } catch (err) {
        return res.status(401).json({
            message: 'Token no valido o expirado',
            err,
        })
    }
}