import { Router } from 'express'
import { JobsController } from '../controllers/job.controller';
import { isAuthenticated } from '../middlewares/auth.middlewares';

export const initJobsRoutes = (jobsController: JobsController) => {
    const router = Router();
    
    // Ruta principal para búsqueda avanzada de trabajos con filtros, ordenamiento y paginación
    router.post('/search', isAuthenticated, (req, res) => jobsController.getJobs(req, res));
    
    // Mantener la ruta original para compatibilidad con versiones anteriores
    router.post('/', isAuthenticated, (req, res) => jobsController.getJobs(req, res));
    
    // Nueva ruta para obtener las opciones de filtro
    router.get('/filter-options', isAuthenticated, (req, res) => jobsController.getFilterOptions(req, res));

    // Rutas adicionales
    router.post('/scraping', (req, res) => jobsController.scrapingJobs(req, res));
    router.get('/stats/scraping', (req, res) => jobsController.getScrapingStats(req, res));
    router.get('/:uid', isAuthenticated, (req, res) => jobsController.getJobByID(req, res));

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