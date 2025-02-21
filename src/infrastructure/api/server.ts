import express, { Express } from 'express';
import cors from 'cors';
import { ControllerProvider, createProvider } from '../../bootstrap';
import { initAuthRoutes } from './routes/auth.router';
import { initJobsRoutes } from './routes/jobs.router';
import { isAuthenticated } from './middlewares/auth.middlewares';
import { initUserRoutes } from './routes/users.router';

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
        console.log('Inicializacion de rutas');
    }


}