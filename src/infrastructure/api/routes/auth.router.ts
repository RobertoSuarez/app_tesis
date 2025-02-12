import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";


// Iniciamos la rutas del auth.
export const initAuthRoutes = (authController: AuthController) => {
    const router = Router();
    
    router.post('/login', (req, res) => authController.login(req, res));
    router.post('/sign-in-with-token', (req, res) => authController.signInWithToken(req, res));

    return router;
}