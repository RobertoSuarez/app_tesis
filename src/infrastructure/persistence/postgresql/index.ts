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


export class PostgreSQLAdapter implements PersistenceAdapterI {

    client: DataSource;
    url: string;
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepositoryI;
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
            entities: [Jobs, Platforms, Search],
        });
    }

    // Una vez creada la instancia de la clase se debe llamar a este metodo.
    public async setup() {
        try {
            await this.client.initialize();
            // console.log('PostgreSQL connected');
        } catch(err) {
            console.error(err);
        }
    }
}