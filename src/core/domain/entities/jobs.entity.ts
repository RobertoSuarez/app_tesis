import { Column, Entity, ManyToOne, OneToMany } from "typeorm";
import { TableBase } from "./common/tablebase.entity";
import { Platforms } from "./platforms.entity";
import { JobLikes } from "./jobLikes.entity";

@Entity()
export class Jobs extends TableBase {

    @ManyToOne(() => Platforms, (platforms) => platforms.jobs)
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
    workType: string; // 'Remote' | 'OnSite' | 'Hybrid';

    @Column({ nullable: true })
    workScheduleType: string; // 'FullTime' | 'PartTime' | 'Contract' | 'Internship';

    @Column({ nullable: true })
    description: string;

    @Column({ type: "json", nullable: true })
    attitudes: string[];

    @Column({ default: false })
    hasSalaryRange: boolean;

    @Column({ default: 0 })
    salaryMin: number;

    @Column({ default: 0 })
    salaryMax: number;

    @Column({ nullable: true })
    disabilityInclusion: boolean;

    @Column({ nullable: true })
    datePosted: string;

    @Column({ nullable: true })
    URL: string;

    @Column({ type: "timestamptz", nullable: true })
    scrapedAt: Date;

    @OneToMany(() => JobLikes, (jobLikes) => jobLikes.job)
    joblikes: JobLikes[];

    /**
     * Área o sector de la empresa o del puesto, útil para evaluar
     * la "relevancia" o alineación con tu profesión.
     */
    @Column({ default: "" })
    area: string;

    /**
     * Si quieres distinguir entre el nombre genérico del puesto (title)
     * y la posición real (por ejemplo, 'Senior Developer', 'Junior Analyst', etc.).
     */
    @Column({ default: "" })
    position: string;

    /**
     * Bonificación monetaria adicional, si la oferta la contempla.
     */
    @Column({ default: 0 })
    bonus: number;

    /**
     * Horas extras estimadas o requeridas (pueden ser pagadas o no).
     */
    @Column({ default: 0 })
    extraHours: number;

    /**
     * Indica si la empresa ofrece oportunidades de crecimiento o plan de carrera.
     */
    @Column({ default: false })
    hasGrowthOpportunities: boolean;

    /**
     * Campo para describir cómo son esas oportunidades de crecimiento,
     * por ejemplo, ascensos, capacitaciones, programas internos, etc.
     */
    @Column({ default: "" })
    growthOpportunitiesDescription: string;

    /**
     * Indica qué tan alineado está el cargo con tu profesión, 
     * por ejemplo en una escala 0-10 o simplemente una descripción.
     */
    @Column({ default: "" })
    alignmentWithProfession: string;

    /**
     * Puedes usar este campo para almacenar o estimar la reputación de la empresa
     * (por ejemplo, a través de una calificación interna de 1 a 5, o 1 a 10).
     */
    @Column({ default: 0 })
    companyReputation: number;

    /**
     * En caso de que quieras tener un índice relativo al costo de vida 
     * de la ubicación. Podría ser un valor calculado según la ciudad.
     */
    @Column({ default: 0 })
    costOfLivingIndex: number;
}
