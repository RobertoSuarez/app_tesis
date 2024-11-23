import { Column } from "typeorm";
import { TableBase } from "./common/tablebase.entity";


export class Industry extends TableBase {

    @Column()
    title: string;

    @Column()
    description: string;
}