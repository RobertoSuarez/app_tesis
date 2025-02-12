import { Column, Entity, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { Jobs } from "./jobs.entity";


@Entity()
export class Platforms extends TableBase {

    @Column({ unique: true })
    name: string;

    @Column()
    url: string;

    @Column({ type: "timestamptz", nullable: true })
    lastScraped: Date;

    @OneToMany(() => Jobs, jobs => jobs.platform)
    jobs: Jobs[];
}