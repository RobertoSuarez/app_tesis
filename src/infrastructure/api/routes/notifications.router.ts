import { Router } from "express";
import { NotificationsController } from "../controllers/notifications.controller";


export const initNotificationsRoutes = (notificationsController: NotificationsController) => {

    const router = Router();

    router.get('/:userUID', (req, res) => notificationsController.getNotificationsByUser(req, res));
    router.put('/:uid/toggle-read', (req, res) => notificationsController.toggleRead(req, res));

    return router;
}