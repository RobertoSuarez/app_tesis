import { DataSource, Repository } from "typeorm";
import { Notification } from "../../domain/entities/notification.entity";
import { RegisterNotification } from "../../domain/dtos/notifications.dtos";
import { User } from "../../domain/entities/user.entity";



export class NotificationsService {
    private _notificationRepository: Repository<Notification>;
    private _userRepository: Repository<User>;

    constructor(
        private _clientSQL: DataSource
    ) {

        this._notificationRepository = this._clientSQL.getRepository(Notification);
        this._userRepository = this._clientSQL.getRepository(User);
    }

    async getNotificationsByUser(userUID: string) {
        const notifications = await this._notificationRepository.find({
            where: {
                user: {
                    uid: userUID,
                }
            },
            order: { createdAt: 'DESC' }
        });


        return notifications;
    }

    async registerNotifications(data: RegisterNotification) {

        const user = await this._userRepository.findOneBy({
            uid: data.userUID,
        })

        if (!user) {
            throw new Error('No existe el usuario')
        }

        const notificationEntity = this._notificationRepository.create({
            user,
            title: data.title,
            body: data.body,
        });

        return await this._notificationRepository.save(notificationEntity);
    }

    async toggleReadNotification(uid: string) {
        const notification = await this._notificationRepository.findOneBy({
            uid: uid,
        });

        if (!notification) {
            throw new Error('Error al encontrar la notificacion')
        }

        notification.read = !notification.read;

        await this._notificationRepository.save(notification);
    }
}