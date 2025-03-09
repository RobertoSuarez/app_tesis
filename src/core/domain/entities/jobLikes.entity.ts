import { Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";
import { Jobs } from "./jobs.entity";


@Entity()
export class JobLikes extends TableBase {

    @ManyToOne(() => User, (user) => user.joblikes)
    user: User;

    @ManyToOne(() => Jobs, (jobs) => jobs.joblikes)
    job: Jobs;
}