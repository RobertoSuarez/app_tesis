import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { Education } from "./eductaion.entity";
import { City } from "./city.entity";
import { JobHistory } from "./jobHistory.entity";
import { Languages } from "./languages.entity";
import { Search } from "./search.entity";
import { JobLikes } from "./jobLikes.entity";
import { IdentificationType } from "./identificationType.entity";



@Entity()
export class User extends TableBase {


    @ManyToOne(() => IdentificationType, (it) => it.users)
    identificationType: IdentificationType;

    @Column()
    identification: string;

    @Column()
    firtName: string;

    @Column()
    lastName: string;

    @Column()
    email: string;

    @Column()
    password: string;

    @Column()
    birthday: Date;

    @Column()
    whatsapp: string;

    @Column()
    urlAvatar: string;

    @Column()
    emailConfirmed: Boolean;

    @Column()
    role: string;

    @Column()
    gender: string;

    @Column()
    disability: boolean;

    @Column({ default: '' })
    preferredWorkType: string;

    @Column({ default: 450 })
    expectedSalaryMin: number;

    @Column({ default: 1000 })
    expectedSalaryMax: number;

    @OneToMany(() => Education, (education) => education.user)
    educations: Education[];

    @ManyToOne(() => City, (city) => city.users)
    city: City;

    @OneToMany(() => JobHistory, (jobHistory) => jobHistory.user)
    jobHistory: JobHistory[];

    @OneToMany(() => Languages, (languages) => languages.user)
    languages: Languages[];


    @OneToMany(() => Search, (search) => search.user)
    searches: Search[];

    @OneToMany(() => JobLikes, (jobLikes) => jobLikes.user)
    joblikes: JobLikes[];
}