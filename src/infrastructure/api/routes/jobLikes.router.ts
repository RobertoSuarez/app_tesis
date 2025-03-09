import { Router } from 'express'
import { JobLikesController } from '../controllers/jobLikes.controller';

export const initJobLikesRoutes = (jobLikesController: JobLikesController) => {
    const router = Router();

    router.get('/:userUID', (req, res) => jobLikesController.getLikes(req, res));
    router.post('/', (req, res) => jobLikesController.registerLike(req, res));
    router.delete('/:likeUID', (req, res) => jobLikesController.deleteLike(req, res));


    return router;
}