import { Column, Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { User } from "./user.entity";


@Entity()
export class Search extends TableBase {


    @Column()
    query: string;

    @Column({ default: false })
    sought: boolean;

    @ManyToOne(() => User, (user) => user.searches, { nullable: true })
    user: User;

}