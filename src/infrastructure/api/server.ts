import express, { Express } from 'express';
import cors from 'cors';
import { ControllerProvider, createProvider } from '../../bootstrap';
import { initAuthRoutes } from './routes/auth.router';
import { initJobsRoutes } from './routes/jobs.router';
import { isAuthenticated } from './middlewares/auth.middlewares';
import { initUserRoutes } from './routes/users.router';
import { initJobLikesRoutes } from './routes/jobLikes.router';
import { initNotificationsRoutes } from './routes/notifications.router';
import { initLocationsRoutes } from './routes/locations.router';
import { initChartsRoutes } from './routes/charts.router';

// ServerExpress configuramos todo los relacionado al servidor http con Express.

export class ServerExpress {

    public app: Express;
    private _controllerProvider: ControllerProvider;

    constructor() {
        this.app = express();
    }

    async initialize() {
        this._controllerProvider = await createProvider();
        this.initMiddlewares();
        this.initRoutes();
    }

    private initMiddlewares() {
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }));
        this.app.use(express.json());
        console.log('Inicializacion de middlwares');
    }

    private initRoutes() {

        if (!this._controllerProvider) {
            throw new Error('Error: _controllerProvider no inicializado');
        }

        this.app.use('/api/user', initUserRoutes(this._controllerProvider.userController));
        this.app.use('/api/auth', initAuthRoutes(this._controllerProvider.authController));
        this.app.use('/api/jobs', initJobsRoutes(this._controllerProvider.jobsController));
        this.app.use('/api/jobLikes', initJobLikesRoutes(this._controllerProvider.jobLikesController))
        this.app.use('/api/notifications', initNotificationsRoutes(this._controllerProvider.notificationsController));
        this.app.use('/api/locations', initLocationsRoutes(this._controllerProvider.locationsController));
        this.app.use('/api/charts', isAuthenticated, initChartsRoutes(this._controllerProvider.chartsController));
        console.log('Inicializacion de rutas');
    }


}