import express from 'express';
import { PlatformsServiceI } from '../../../domain/ports/platforms.port';


export class PlatformsRouter {

    public router: express.Router;
    platformService: PlatformsServiceI;

    constructor(platformsService: PlatformsServiceI) {
        this.platformService = platformsService;
        this.router = express.Router();

        this.router.post(
            '/', 
            async (req, res, next) => await this.createPlatform(req, res, next, this.platformService),
        );
    }


    async createPlatform(req, res, next, platformsService: PlatformsServiceI) {
        try {
            const platform = await platformsService.registerPlatform(req.body);
            res.json(platform);
        } catch(err) {
            next(err)
        }
    }
}