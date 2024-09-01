import { Domain } from '../../../../domain';
import express from 'express';
import { PlatformsRouter } from './platforms.router';


export class Routes {

    constructor(app: express.Express, domain: Domain) {
        const router = express.Router();
        
        // Generamos rutas asociadas a los servicios.
        const platformsRouter = new PlatformsRouter(domain.providersServices.platformsService);
        
        router.use('/platforms', platformsRouter.router);

        app.use(router);
    }
}