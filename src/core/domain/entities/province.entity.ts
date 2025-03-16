import { Column, Entity, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { City } from "./city.entity";
import { User } from "./user.entity";


@Entity()
export class Province extends TableBase {

    @Column()
    name: string;


    @OneToMany(() => City, (city) => city.province)
    cities: City[];

    @OneToMany(() => User, (user) => user.province)
    users: User[];

}