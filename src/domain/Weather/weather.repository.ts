import { Weather } from "./weather.entity";


export interface WeatherRepositoryI {
    update(weather: Weather): Promise<Weather>;
    findFirst(): Promise<Weather | null>;
}