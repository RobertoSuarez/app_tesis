import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { Province } from "./province.entity";
import { User } from "./user.entity";


@Entity()
export class City extends TableBase {

    @Column()
    name: string;

    @Column()
    lat: number;

    @Column()
    long: number;

    @ManyToOne(() => Province, (province) => province.cities)
    province: Province;

    @OneToMany(() => User, (user) => user.city)
    users: User[];
}