import 'reflect-metadata';
import sqlite3 from 'sqlite3';


export class SQLiteAdapter {
    
    client: sqlite3.Database;

    constructor() {
        this.client = this.connect();
        this.setup();
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