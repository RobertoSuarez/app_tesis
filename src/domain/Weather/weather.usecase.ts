import { Weather } from "./weather.entity";
import { WeatherRepositoryI } from "./weather.repository";


export class WeatherUseCase {

    repository: WeatherRepositoryI; 

    constructor(repository: WeatherRepositoryI) {
        if (repository === null ) throw new Error('repository is null');
        this.repository = repository;
    }

    async update(weather: Weather) {
        return await this.repository.update(weather);
    }

    async current() {
        const weather = await this.repository.findFirst();
        if (weather === null) {
            return this.update(new Weather(10, 40, new Date()));
        }
        return weather;
    }
}