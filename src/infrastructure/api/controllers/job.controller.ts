import { Request, Response } from "express";
import { JobsService } from "../../../application/services/jobs.service";
import { User } from "../../../domain/entities/user.entity";


export class JobsController {
    constructor(
        private _jobsService: JobsService
    ) { }

    async getJobs(req: Request, res: Response) {
        const { user }: { user: User } = req['user'];
        const search = req.query["search"] as string;

        const jobs = await this._jobsService.getJobs(user.uid, search);
        return res.json({
            status: 'success',
            length: jobs.length,
            jobs: jobs,
        });
    }

    async scrapingJobs(req: Request, res: Response) {
        await this._jobsService.webScrapingJobs(2);
        return res.json({
            message: 'se ha scrapeado todo',
        })
    }
}