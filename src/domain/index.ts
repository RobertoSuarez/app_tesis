import { PersistenceAdapter } from "../infrastructure/adapter";
import { WeatherUseCase } from "./Weather/weather.usecase";


interface Port {
    WeatherUseCase: WeatherUseCase
}

export class Domain {
    
    public port: Port

    constructor(persistenceAdapter: PersistenceAdapter) {
        this.port = {
            WeatherUseCase: new WeatherUseCase(persistenceAdapter.weatherRepository)
        }
    }
}