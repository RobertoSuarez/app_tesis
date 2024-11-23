import { Column, Entity, ManyToOne, Table } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";


@Entity()
export class JobHistory extends TableBase {

    @Column()
    jobTitle: string;

    @Column()
    company: string;

    @Column()
    start: Date;

    @Column()
    end: Date;

    @ManyToOne(() => User, (user) => user.jobHistory)
    user: User;
}