import sqlite3 from "sqlite3";
import { WeatherRepositoryI } from "../../../domain/Weather/weather.repository";
import { Weather } from "../../../domain/Weather/weather.entity";

export class WeatherRepository implements WeatherRepositoryI {
  client: sqlite3.Database;

  constructor(sqlClient: sqlite3.Database) {
    this.client = sqlClient;
  }

  async update(weather: Weather): Promise<Weather> {
    try {
      const current_weather = await this.findFirst();
      const currentTimeStamp = new Date().toISOString();
      if (current_weather != null) {
        const query = `UPDATE weather SET temperature = ${weather.temperature}, humidity = ${weather.humidity}, last_update = "${currentTimeStamp}" WHERE 1`;
        await this.client.run(query);
      } else {
        const insertQuery = `INSERT INTO weather (temperature, humidity, last_update) VALUES (${weather.temperature}, ${weather.humidity}, "${currentTimeStamp}")`;
        await this.client.run(insertQuery);
      }
      return new Weather(weather.temperature, weather.humidity, new Date());
    } catch (err) {
      return null;
    }
  }

  async findFirst(): Promise<Weather | null> {
    const query = "SELECT * FROM weather ORDER BY last_update DESC LIMIT 1";
    const result = await new Promise<any[]>((resolve, reject) => {
      this.client.all<any[]>(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    console.log(result);
    if (result.length > 0) {
      return new Weather(result[0].temperature, result[0].humidity, new Date());
    } else {
      return null;
    }
  }
}
