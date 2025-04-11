import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class ScrapingStats {
  @PrimaryGeneratedColumn("uuid")
  uid: string;

  @Column({ type: "varchar", length: 255 })
  searchQuery: string;

  @Column({ type: "int" })
  totalUrlsFound: number;

  @Column({ type: "int" })
  successfulExtractions: number;

  @Column({ type: "int" })
  failedExtractions: number;

  @Column({ type: "float" })
  successRate: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  platform: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
