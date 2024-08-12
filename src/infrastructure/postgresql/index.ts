import 'reflect-metadata';
import { PersistenceAdapter } from "../adapter";
import { DataSource } from 'typeorm';
import { Weather } from '../../domain/Weather/weather.entity';
import { WeatherRepository } from './repository/weather.imp';


export class PostgreSQLAdapter extends PersistenceAdapter {

    client: DataSource;
    url: string;

    constructor(url: string) {
        super();
        this.url = url;
        this.client = this.connect();
        this.weatherRepository = new WeatherRepository(this.client);
    }

    connect() {
        return new DataSource({
            type: 'postgres',
            url: this.url,
            synchronize: true,
            entities: [Weather],
        });
    }

    // Una vez creada la instancia de la clase se debe llamar a este metodo.
    public async setup() {
        try {
            await this.client.initialize();
            console.log('PostgreSQL connected');
        } catch(err) {
            console.error(err);
        }
    }
}