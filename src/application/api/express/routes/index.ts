import { Domain } from '../../../../domain';
import express from 'express';
import { PlatformsRouter } from './platforms.router';
import { JobsRouter } from './jobs.router';


export class Routes {

    constructor(app: express.Express, domain: Domain) {
        const router = express.Router();
        
        // Generamos rutas asociadas a los servicios.
        const platformsRouter = new PlatformsRouter(domain.providersServices.platformsService);
        const jobsRouter = new JobsRouter(domain.providersServices.jobsService);
        
        router.use('/platforms', platformsRouter.router);
        router.use('/jobs', jobsRouter.router);

        app.use(router);
    }
}