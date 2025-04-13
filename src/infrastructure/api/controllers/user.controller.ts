import { Request, Response } from "express";
import { UpdateUser } from "../../../core/domain/dtos/user.dtos";
import { registerJobHistory } from "../../../core/domain/dtos/jobHistory.dtos";
import { createEducation } from "../../../core/domain/dtos/education.dtos";
import { registerLanguage } from "../../../core/domain/dtos/language.dtos";
import { UserService } from "../../../core/application/services/user.service";
import { JobHistoryService } from "../../../core/application/services/jobHistory.service";
import { EducationService } from "../../../core/application/services/education.service";
import { LanguageService } from "../../../core/application/services/language.service";


export class UserController {
    constructor(
        private _userSerivce: UserService,
        private _jobHistoryService: JobHistoryService,
        private _educationService: EducationService,
        private _languageService: LanguageService,
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
        
        const data = req.body as registerJobHistory;
        const { user } = req["user"];
        data.userUID = user.uid;
        const result = await this._jobHistoryService.registerWork(data);
        res.json({
            status: 'success',
            data: result,
        })
    }

    public async getEducation(req: Request, res: Response) {
        const { uid } = req.params;
        const result = await this._educationService.getEducation(uid);
        res.json({
            status: 'success',
            data: result,
        })
    }

    public async registerEducation(req: Request, res: Response) {
        const { uid } = req.params;
        const { institucion, titulo, description, start, end } = req.body;
        const data: createEducation = {
            uid,
            institucion,
            titulo,
            description,
            start: new Date(start), // Convierte el string a Date
            end: new Date(end),     // Convierte el string a Date
        };

        const result = await this._educationService.registerEducation(data);
        res.json({
            status: 'success',
            data: result,
        })
    }

    public async getLanguages(req: Request, res: Response) {
        const { uid } = req.params;
        const result = await this._languageService.getLanguagesByUser(uid);
        res.json({
            status: 'success',
            data: result,
        })
    }

    public async registerLanguage(req: Request, res: Response) {
        const { uid } = req.params;
        const { title, description, level } = req.body;
        const data: registerLanguage = {
            userId: uid,
            title,
            description,
            level
        };
        const result = await this._languageService.registerLanguage(data);
        res.json({
            status: 'success',
            data: result.uid,
        })
    }


}