import { NextFunction, Request, Response, Router } from 'express'
import { JobsService } from '../../../../domain/services/jobs.service';
import { User } from '../../../../domain/models/user.entity';


export class JobsRouter {

    public router: Router;
    public jobsService: JobsService;


    constructor(jobsService: JobsService) {
        this.jobsService = jobsService;

        this.router = Router();
        this.router.get('/', this.getJobs.bind(this));
    }


    async getJobs(req: Request, res: Response, next: NextFunction) {

        const { user }: { user: User} = req['user'];
        const search = req.query["search"] as string;
        const jobs = await this.jobsService.getJobs(user.uid, search);
        return res.json({
            message: "Muchos trabajos",
            jobs,
        });
    }

}