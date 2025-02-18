import { Request, Response } from "express";
import { UserService } from "../../../application/services/user.service";
import { config } from "../../../shared/config/config";
import { verify } from "jsonwebtoken";
import { User } from "../../../domain/entities/user.entity";
import Joi from "joi";


// Controlador para auth y user.
export class AuthController {
    constructor(
        private _userService: UserService
    ) {
    }

    public async login(req: Request, res: Response) {
        const { email, password } = req.body;
        try {
            const result = await this._userService.login(email, password);
            res.json({
                status: 'success',
                data: result
            });
        } catch (error) {
            console.error("Error en login:", error);
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
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

    public async registerUser(req: Request, res: Response) {
        try {
            // Validar los datos del body usando Joi
            const { error, value } = registerUserSchema.validate(req.body, { abortEarly: false });

            // Si hay errores, se envía una respuesta con los mensajes de error
            if (error) {
                return res.status(400).json({
                    errors: error.details.map(detail => detail.message)
                });
            }

            // Extraer los valores validados (ya normalizados)
            const { firstName, email, password } = value;

            // Registrar el usuario usando el servicio correspondiente
            const result = await this._userService.registerUser(firstName, email, password);

            return res.status(201).json({
                status: 'success',
                message: 'El usuario se creó con éxito.',
                data: result // Puedes ajustar o eliminar este campo según lo requieras
            });
        } catch (err) {
            console.error('Error en registerUser:', err);
            return res.status(500).json({
                error: 'Ocurrió un error al registrar el usuario. Intenta nuevamente más tarde.',
                details: err.message,
            });
        }
    }

    public async verifyEmail(req: Request, res: Response) {
        try {
            const { token } = req.query;
            await this._userService.verifyEmail(token as string);
            res.json({
                status: 'success',
                message: 'El correo electrónico se verificó con éxito.'
            });

        } catch (error) {
            res.status(400).json({
                status: 'error',
                message: error.message,
            })
        }
    }
}

const registerUserSchema = Joi.object({
    firstName: Joi.string()
        .trim()
        .required()
        .messages({
            'string.base': 'El nombre debe ser una cadena de texto.',
            'string.empty': 'El nombre es obligatorio.',
            'any.required': 'El nombre es obligatorio.'
        }),
    email: Joi.string()
        .email({ tlds: { allow: false } })
        .required()
        .messages({
            'string.base': 'El correo electrónico debe ser una cadena de texto.',
            'string.empty': 'El correo electrónico es obligatorio.',
            'string.email': 'El formato del correo electrónico no es válido.',
            'any.required': 'El correo electrónico es obligatorio.'
        }),
    password: Joi.string()
        .min(6)
        .required()
        .messages({
            'string.base': 'La contraseña debe ser una cadena de texto.',
            'string.empty': 'La contraseña es obligatoria.',
            'string.min': 'La contraseña debe tener al menos 6 caracteres.',
            'any.required': 'La contraseña es obligatoria.'
        })
});