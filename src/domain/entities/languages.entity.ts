import { Column, Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";


@Entity()
export class Languages extends TableBase {

    @Column()
    title: string;

    @Column({ default: 'Basico' })
    nivel: string;

    @Column()
    description: string;

    @ManyToOne(() => User, (user) => user.languages)
    user: User;
}