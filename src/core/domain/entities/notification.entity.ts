import { Column, Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";



@Entity()
export class Notification extends TableBase {

    @Column()
    title: string;

    @Column()
    body: string;

    @ManyToOne(() => User, (user) => user.notifications, { nullable: true })
    user: User;
}