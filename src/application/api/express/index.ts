import express, { Express } from 'express';
import cors from 'cors';
import { AppAdapter } from "../adapter";
import { Routes } from './routes';
import { Domain } from '../../../domain';
import { errorHandler, logErrors } from './middlewares/error.handler';


export class ExpressAdapter implements AppAdapter {
    app: Express;
    router: Routes;

    constructor(domain: Domain) {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());
        this.router = new Routes(this.app, domain);
        this.app.use(logErrors);
        this.app.use(errorHandler);
    }

    listen(port: number): void {
        this.app.listen(port, () => console.log(`Listening on port ${port}`));
    }
}