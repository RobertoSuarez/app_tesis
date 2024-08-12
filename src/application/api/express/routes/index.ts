import { Domain } from '../../../../domain';
import express from 'express';
import { WeatherRouter } from './weatherRouter';


export class Routes {

    constructor(app: express.Express, domain: Domain) {
        const router = express.Router();
        
        // Generamos rutas asociadas a los casos de usos.
        const weatherRoutes = new WeatherRouter(domain.port.WeatherUseCase);
        
        router.use('/weather', weatherRoutes.router);

        app.use(router);
    }
}