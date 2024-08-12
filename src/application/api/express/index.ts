import express, { Express } from 'express';
import cors from 'cors';
import { AppAdapter } from "../adapter";
import { Routes } from './routes';
import { Domain } from '../../../domain';


export class ExpressAdapter implements AppAdapter {
    app: Express;
    router: Routes;

    constructor(domain: Domain) {
        this.app = express();
        this.app.use(cors());
        this.router = new Routes(this.app, domain);
    }

    listen(port: number): void {
        this.app.listen(port, () => console.log(`Listening on port ${port}`));
    }
}