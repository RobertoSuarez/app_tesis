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

    @ManyToOne(() => IdentificationType, (it) => it.users, { nullable: true })
    identificationType?: IdentificationType;

    @Column({ nullable: true })
    identification?: string;

    // Campo obligatorio
    @Column({ nullable: true })
    firstName: string;

    @Column({ nullable: true })
    lastName?: string;

    // Campo obligatorio
    @Column({ unique: true })
    email: string;

    // Campo obligatorio
    @Column()
    password: string;

    @Column({ type: 'date', nullable: true })
    birthday?: Date;

    @Column({ nullable: true })
    whatsapp?: string;

    @Column({ nullable: true })
    urlAvatar?: string;

    @Column({ nullable: true, default: false })
    emailConfirmed?: boolean;

    @Column({ nullable: true })
    role?: string;

    @Column({ nullable: true })
    gender?: string;

    @Column({ nullable: true })
    disability?: boolean;

    @Column({ default: '', nullable: true })
    preferredWorkType?: string;

    @Column({ default: 450, nullable: true })
    expectedSalaryMin?: number;

    @Column({ default: 1000, nullable: true })
    expectedSalaryMax?: number;

    @OneToMany(() => Education, (education) => education.user)
    educations?: Education[];

    @ManyToOne(() => City, (city) => city.users, { nullable: true })
    city?: City;

    @OneToMany(() => JobHistory, (jobHistory) => jobHistory.user)
    jobHistory?: JobHistory[];

    @OneToMany(() => Languages, (languages) => languages.user)
    languages?: Languages[];

    @OneToMany(() => Search, (search) => search.user)
    searches?: Search[];

    @OneToMany(() => JobLikes, (jobLikes) => jobLikes.user)
    joblikes?: JobLikes[];
}