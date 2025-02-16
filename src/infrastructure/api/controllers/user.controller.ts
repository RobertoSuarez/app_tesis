import { Request, Response } from "express";
import { UserService } from "../../../application/services/user.service";
import { UpdateUser } from "../../../domain/dtos/user.dtos";
import { JobHistoryService } from "../../../application/services/jobHistory.service";
import { registerJobHistory } from "../../../domain/dtos/jobHistory.dtos";


export class UserController {
    constructor(
        private _userSerivce: UserService,
        private _jobHistoryService: JobHistoryService,
    ) { }

    public async getUserByUID(req: Request, res: Response) {
        const { uid } = req.params;
        const user = await this._userSerivce.getUserByIDSimplet(uid);
        delete user.password;
        res.json({
            status: 'success',
            data: user,
        })
    }

    public async updateUser(req: Request, res: Response) {
        const { uid } = req.params;
        const data = req.body as UpdateUser;
        data.uid = uid;

        const result = await this._userSerivce.updateUser(data);

        res.json({
            status: 'success',
            data: result,
        })
    }


    public async getWorkHistory(req: Request, res: Response) {
        const { uid } = req.params;
        const result = await this._jobHistoryService.getWorkHistory(uid);
        res.json({
            status: 'success',
            data: result,
        })
    }

    public async registerWork(req: Request, res: Response) {
        const { uid } = req.params;
        const data = req.body as registerJobHistory;
        const result = await this._jobHistoryService.registerWork(data);
        res.json({
            status: 'success',
            data: result,
        })
    }
}