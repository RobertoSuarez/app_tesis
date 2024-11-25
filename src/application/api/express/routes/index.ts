import { Domain } from '../../../../domain';
import express from 'express';
import { PlatformsRouter } from './platforms.router';
import { JobsRouter } from './jobs.router';
import { AuthRouter } from './auth.router';
import { isAuthenticated } from '../middlewares/auth.middlewares';


export class Routes {

    constructor(app: express.Express, domain: Domain) {
        const router = express.Router();
        
        // Generamos rutas asociadas a los servicios.
        const platformsRouter = new PlatformsRouter(domain.providersServices.platformsService);
        const jobsRouter = new JobsRouter(domain.providersServices.jobsService);
        const authRouter = new AuthRouter(domain.providersServices.userService);
        
        router.use('/platforms', platformsRouter.router);
        router.use('/jobs', isAuthenticated, jobsRouter.router);
        router.use('/auth', authRouter.router);

        app.use(router);
    }
}