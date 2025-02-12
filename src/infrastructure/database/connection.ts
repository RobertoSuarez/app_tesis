import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Jobs } from '../../domain/entities/jobs.entity';
import { Platforms } from '../../domain/entities/platforms.entity';
import { Search } from '../../domain/entities/search.entity';
import { User } from '../../domain/entities/user.entity';
import { City } from '../../domain/entities/city.entity';
import { Education } from '../../domain/entities/eductaion.entity';
import { Industry } from '../../domain/entities/industry.entity';
import { Province } from '../../domain/entities/province.entity';
import { JobHistory } from '../../domain/entities/jobHistory.entity';
import { Languages } from '../../domain/entities/languages.entity';
import { JobLikes } from '../../domain/entities/jobLikes.entity';
import { IdentificationType } from '../../domain/entities/identificationType.entity';


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