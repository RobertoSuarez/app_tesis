import { Column, Entity, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { City } from "./city.entity";


@Entity()
export class Province extends TableBase {

    @Column()
    name: string;


    @OneToMany(() => City, (city) => city.province)
    cities: City[];

}