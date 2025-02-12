import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";


@Entity()
export class IdentificationType extends TableBase {

    @Column()
    name: string;

    @OneToMany(() => User, (user) => user.identificationType)
    users: User[];
}