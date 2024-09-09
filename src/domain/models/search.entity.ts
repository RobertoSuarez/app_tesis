import { Column, Entity } from "typeorm";
import { TableBase } from "./common/tablebase.entity";


@Entity()
export class Search extends TableBase {


    @Column()
    query: string;

    @Column({ default: false })
    sought: boolean;

}