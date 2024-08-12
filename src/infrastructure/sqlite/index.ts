import 'reflect-metadata';
import sqlite3 from 'sqlite3';
import { PersistenceAdapter } from "../adapter";
import { WeatherRepository } from './repository/weather';


export class SQLiteAdapter extends PersistenceAdapter {
    
    client: sqlite3.Database;

    constructor() {
        super();
        this.client = this.connect();
        this.setup();
        this.weatherRepository = new WeatherRepository(this.client);
    }

    connect() {
        return new sqlite3.Database(':memory:');
    }

    setup() {
        this.client.run(
            `CREATE TABLE IF NOT EXISTS 
            weather(
                temperature REAL, 
                humidity REAL,
                last_update TEXT
            )`
        )
    }
}