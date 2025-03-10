import { Request, Response } from "express";
import { NotificationsService } from "../../../core/application/services/notifications.service";


export class NotificationsController {

    constructor(

        private _notificationsService: NotificationsService,
    ) { }

    async getNotificationsByUser(req: Request, res: Response) {
        const userUID = req.params.userUID;
        const result = await this._notificationsService.getNotificationsByUser(userUID);

        return res.json({
            status: 'success',
            data: result,
        })
    }

    async toggleRead(req: Request, res: Response) {
        const uid = req.params.uid;

        await this._notificationsService.toggleReadNotification(uid);

        return res.json({
            status: 'success',
            data: true,
        })

    }
}