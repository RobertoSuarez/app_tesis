import { Column, Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";


@Entity()
export class Education extends TableBase {

    @Column()
    institucion: string;

    @Column()
    titulo: string;

    @Column()
    description: string;

    @Column()
    start: Date;

    @Column()
    end: Date;

    @ManyToOne(() => User, (user) => user.educations)
    user: User;
}