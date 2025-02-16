import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export const initUserRoutes = (userController: UserController) => {
    const router = Router();
    // Info del usuario
    router.get('/:uid', (req, res) => userController.getUserByUID(req, res));
    router.put('/:uid', (req, res) => userController.updateUser(req, res));

    // Historial de trabajo.
    router.get('/:uid/work-history', (req, res) => userController.getWorkHistory(req, res));
    router.post('/:uid/work-history', (req, res) => userController.registerWork(req, res));

    return router;
}