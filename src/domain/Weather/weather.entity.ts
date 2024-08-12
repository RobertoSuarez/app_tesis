import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";


@Entity()
export class Weather {

    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column({ type: "float", nullable: false })
    temperature: number = 0;

    @Column({ type: "float", nullable: false })
    humidity: number = 0;

    @Column({ type: 'timestamptz', nullable: true, default: () => "CURRENT_TIMESTAMP" })
    time: Date;
    

    constructor(temperature: number, humidity: number, time: Date) {
        this.temperature = temperature;
        this.humidity = humidity;
        this.time = time;
    }
}