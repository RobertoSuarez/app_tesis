import { Column, Entity, ManyToOne } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { Platforms } from "./platforms.entity";


@Entity()
export class Jobs extends TableBase {
    

    @ManyToOne(() => Platforms, platforms => platforms.jobs)
    platform: Platforms;

    @Column()
    title: string;

    @Column({ nullable: true })
    Company: string;

    @Column({ nullable: true })
    Location: string;

    @Column({ nullable: true })
    levelExperience: string;

    @Column({ nullable: true })
    workType:  string; //'Remote' | 'OnSite' | 'Hybrid';

    @Column({ nullable: true })
    workScheduleType: string; // 'FullTime' | 'PartTime' | 'Contract' | 'Internship';

    @Column({ nullable: true })
    description: string;

    @Column({ type: "json", nullable: true })
    attitudes: string[];

    @Column({ nullable: true })
    salaryRange: string;
    
    @Column({ nullable: true })
    disabilityInclusion: boolean;

    @Column({ nullable: true })
    datePosted: string;

    @Column({ nullable: true })
    URL: string;

    @Column({ type: "timestamptz", nullable: true })
    scrapedAt: Date;
}