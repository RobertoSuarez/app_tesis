import express from 'express';
import { WeatherUseCase } from '../../../../domain/Weather/weather.usecase';


export class WeatherRouter {

    public router: express.Router;

    constructor(weatherUseCase: WeatherUseCase) {

        this.router = express.Router();
        this.router.get('/', 
            async (req, res, next) => await this.getCurrentWeather(req, res, next, weatherUseCase)
        );
    }

    async getCurrentWeather(req, res, next, weatherUseCase: WeatherUseCase) {
        try {
            const currentWeather = await weatherUseCase.current();
            console.log(currentWeather);
            res.json({
                temperature: currentWeather.temperature,
                humidity: currentWeather.humidity,
            });
        } catch(err) {
            next(err)
        }
    }
}