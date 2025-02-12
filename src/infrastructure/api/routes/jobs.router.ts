import { Router } from 'express'
import { JobsController } from '../controllers/job.controller';

export const initJobsRoutes = (jobsController: JobsController) => {
    const router = Router();
    router.get('/', (req, res) => jobsController.getJobs(req, res));

    return router;
}

// export class JobsRouter {

//     public router: Router;
//     public jobsService: JobsService;


//     constructor(jobsService: JobsService) {
//         this.jobsService = jobsService;

//         this.router = Router();
//         this.router.get('/', this.getJobs.bind(this));
//     }


//     async getJobs(req: Request, res: Response, next: NextFunction) {

//         const { user }: { user: User} = req['user'];
//         const search = req.query["search"] as string;
//         const jobs = await this.jobsService.getJobs(user.uid, search);
//         return res.json({
//             status: 'success',
//             length: jobs.length,
//             jobs: jobs,
            

//         });
//     }

// }