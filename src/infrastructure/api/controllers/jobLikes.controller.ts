import { Request, Response } from "express";
import { JobLikesService } from "../../../core/application/services/JobLikes.service";


export class JobLikesController {

    constructor(
        private _jobLikesService: JobLikesService
    ) { }


    async registerLike(req: Request, res: Response) {

        const result = await this._jobLikesService.registerJobLike(req.body);

        return res.json({
            status: 'success',
            data: result ? true : false,
        })
    }

    async getLikes(req: Request, res: Response) {
        const userUID = req.params.userUID;
        const result = await this._jobLikesService.getJobLikeByUser(userUID);

        return res.json({
            status: 'success',
            data: result,
        })
    }

    async deleteLike(req: Request, res: Response) {
        const likeUID = req.params.likeUID;
        const result = await this._jobLikesService.deleteLike(likeUID);
        return res.json({
            status: 'success',
            data: result
        })
    }
}