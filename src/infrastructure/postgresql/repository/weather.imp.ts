import { DataSource, Repository } from "typeorm";
import { WeatherRepositoryI } from "../../../domain/Weather/weather.repository";
import { Weather } from "../../../domain/Weather/weather.entity";



export class WeatherRepository implements WeatherRepositoryI {

    client: DataSource;
    weatherRepositoryTypeOrm: Repository<Weather>;

    constructor(client: DataSource) {
        this.client = client;
        this.weatherRepositoryTypeOrm = this.client.getRepository(
            Weather
        );
    }

    async update(weather: Weather): Promise<Weather> {
        try {
            const currentWeather = await this.findFirst();
            if (currentWeather !== null) {

                currentWeather.temperature = weather.temperature;
                currentWeather.humidity = weather.humidity;
                currentWeather.time = new Date();
                // actualizar
                this.weatherRepositoryTypeOrm.save(currentWeather);
                return currentWeather;
            } else {
                weather.time = new Date();
                weather = await this.weatherRepositoryTypeOrm.save(weather);
                return weather;
            }
        } catch(err) {
            throw err;
        }
    }

    async findFirst(): Promise<Weather | null> {
        const [weather, count] =  await this.weatherRepositoryTypeOrm.findAndCount();
        if (count > 0) {
            return weather[0];
        } else {
            return null;
        }
    }

    
}