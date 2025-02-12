import express, { Express } from 'express';
import cors from 'cors';
import { AppAdapter } from "../adapter";
import { Domain } from '../../../domain';
import { errorHandler, logErrors } from '../../../infrastructure/api/middlewares/error.handler';


export class ExpressAdapter implements AppAdapter {
    app: Express;

    constructor(domain: Domain) {
        this.app = express();
        this.app.use(cors());
        this.app.use(express.json());

        this.app.use(logErrors);
        this.app.use(errorHandler);
    }

    listen(port: number): void {
        this.app.listen(port, () => console.log(`Listening on port ${port}`));
    }
}