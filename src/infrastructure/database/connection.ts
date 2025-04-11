import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Jobs } from '../../core/domain/entities/jobs.entity';
import { Platforms } from '../../core/domain/entities/platforms.entity';
import { Search } from '../../core/domain/entities/search.entity';
import { User } from '../../core/domain/entities/user.entity';
import { City } from '../../core/domain/entities/city.entity';
import { Education } from '../../core/domain/entities/eductaion.entity';
import { Industry } from '../../core/domain/entities/industry.entity';
import { Province } from '../../core/domain/entities/province.entity';
import { JobHistory } from '../../core/domain/entities/jobHistory.entity';
import { Languages } from '../../core/domain/entities/languages.entity';
import { JobLikes } from '../../core/domain/entities/jobLikes.entity';
import { IdentificationType } from '../../core/domain/entities/identificationType.entity';
import { Notification } from '../../core/domain/entities/notification.entity';
import { ScrapingStats } from '../../core/domain/entities/scraping-stats.entity';


export class ConnectionDB {

    public client: DataSource;
    url: string;

    constructor(url: string) {
        this.url = url;
        this.client = this.connect();
    }


    connect() {
        return new DataSource({
            type: 'postgres',
            url: this.url,
            synchronize: true,
            entities: [
                Jobs,
                Platforms,
                Search,
                User,
                City,
                Education,
                Industry,
                Province,
                User,
                JobHistory,
                Languages,
                JobLikes,
                IdentificationType,
                Notification,
                ScrapingStats,
            ],
        });
    }

    // Una vez creada la instancia de la clase se debe llamar a este metodo.
    public async setup() {
        try {
            await this.client.initialize();
            console.log('DB sincronizada');
            // console.log('PostgreSQL connected');
        } catch (err) {
            console.error(err);
        }
    }
}