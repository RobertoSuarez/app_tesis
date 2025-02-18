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

    // Educacion
    router.get('/:uid/education', (req, res) => userController.getEducation(req, res));
    router.post('/:uid/education', (req, res) => userController.registerEducation(req, res));

    // Lenguajes
    router.get('/:uid/languages', (req, res) => userController.getLanguages(req, res));
    router.post('/:uid/languages', (req, res) => userController.registerLanguage(req, res));


    return router;
}