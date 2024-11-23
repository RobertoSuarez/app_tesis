import { NextFunction, Request, Response, Router } from 'express'
import { JobsService } from '../../../../domain/services/jobs.service';


export class JobsRouter {

    public router: Router;
    public jobsService: JobsService;


    constructor(jobsService: JobsService) {
        this.jobsService = jobsService;

        this.router = Router();
        this.router.get('/', this.getJobs.bind(this));
    }


    async getJobs(req: Request, res: Response, next: NextFunction) {

        const jobs = await this.jobsService.getJobs('asdf', "programacion en golang");
        return res.json({
            message: "Muchos trabajos",
            jobs,
        });
    }

}