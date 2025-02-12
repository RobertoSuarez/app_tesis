import { Request, Response } from "express";
import { UserService } from "../../../application/services/user.service";
import { config } from "../../../shared/config/config";
import { verify } from "jsonwebtoken";
import { User } from "../../../domain/entities/user.entity";


// Controlador para auth y user.
export class AuthController {
    constructor(
        private _userService: UserService
    ) {
    }

    public async login(req: Request, res: Response) {
        const { email, password } = req.body;
        const result = await this._userService.login(email, password);
        res.json({
            status: 'success',
            data: result
        });
    }

    public async signInWithToken(req: Request, res: Response) {
        // Validar que se haya enviado el token en el body
        const { accessToken } = req.body;
        if (!accessToken || typeof accessToken !== "string") {
            return res.status(400).json({
                error: "El token de acceso es requerido y debe ser un string."
            });
        }

        // Remover el prefijo 'Bearer ' si existe
        const token = accessToken.startsWith("Bearer ")
            ? accessToken.slice(7)
            : accessToken;

        try {
            // Verificar y decodificar el token
            const decoded = verify(token, config.KEY_JWT);
            const { user }: { user: User } = decoded as any;

            const result = await this._userService.loginWithID(user.uid);
            return res.json({
                status: 'success',
                data: result
            });
        } catch (error) {
            console.error("Error al verificar el token:", error);
            return res.status(401).json({
                error: "Token inválido o expirado."
            });
        }


    }
}