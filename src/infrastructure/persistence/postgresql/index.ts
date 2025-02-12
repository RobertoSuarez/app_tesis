import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PersistenceAdapterI } from '../adapter';
import { PlatformsRepositoryI } from '../../../domain/ports/platforms.port';
import { PlatformsRepository } from './repository/plataforms.imp';
import { JobsRepository } from './repository/jobs.imp';
import { SearchRepositoryI } from '../../../domain/ports/search.port';
import { SearchRepository } from './repository/searchh.imp';
import { Jobs } from 'openai/resources/fine-tuning/jobs/jobs';
import { Platforms } from '../../../domain/entities/platforms.entity';
import { Search } from '../../../domain/entities/search.entity';
import { User } from '../../../domain/entities/user.entity';
import { City } from '../../../domain/entities/city.entity';
import { Education } from '../../../domain/entities/eductaion.entity';
import { Industry } from '../../../domain/entities/industry.entity';
import { Province } from '../../../domain/entities/province.entity';
import { JobHistory } from '../../../domain/entities/jobHistory.entity';
import { Languages } from '../../../domain/entities/languages.entity';
import { JobLikes } from '../../../domain/entities/jobLikes.entity';
import { IdentificationType } from '../../../domain/entities/identificationType.entity';


export class PostgreSQLAdapter implements PersistenceAdapterI {

    public client: DataSource;
    url: string;
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepository;
    searchRepository: SearchRepositoryI;

    constructor(url: string) {
        this.url = url;
        this.client = this.connect();
        this.platformsRepository = new PlatformsRepository(this.client);
        this.jobsRepository = new JobsRepository(this.client);
        this.searchRepository = new SearchRepository(this.client);
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