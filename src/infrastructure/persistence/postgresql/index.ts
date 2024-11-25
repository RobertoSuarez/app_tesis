import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PersistenceAdapterI } from '../adapter';
import { PlatformsRepositoryI } from '../../../domain/ports/platforms.port';
import { PlatformsRepository } from './repository/plataforms.imp';
import { Jobs } from '../../../domain/models/jobs.entity';
import { Platforms } from '../../../domain/models/platforms.entity';
import { Search } from '../../../domain/models/search.entity';
import { JobsRepositoryI } from '../../../domain/ports/jobs.port';
import { JobsRepository } from './repository/jobs.imp';
import { SearchRepositoryI } from '../../../domain/ports/search.port';
import { SearchRepository } from './repository/searchh.imp';
import { User } from '../../../domain/models/user.entity';
import { City } from '../../../domain/models/city.entity';
import { Education } from '../../../domain/models/eductaion.entity';
import { Industry } from '../../../domain/models/industry.entity';
import { Province } from '../../../domain/models/province.entity';
import { JobHistory } from '../../../domain/models/jobHistory.entity';
import { Languages } from '../../../domain/models/languages.entity';
import { JobLikes } from '../../../domain/models/jobLikes.entity';
import { IdentificationType } from '../../../domain/models/identificationType.entity';


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
        } catch(err) {
            console.error(err);
        }
    }
}