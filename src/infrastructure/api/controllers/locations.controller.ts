import { Request, Response } from "express";
import { LocationsService } from "../../../core/application/services/localitation.service";


export class LocationsController {

    constructor(
        private _locationsService: LocationsService,
    ) { }

    public async getCities(req: Request, res: Response) {
        const { provinceUID } = req.params;
        const result = await this._locationsService.getCities(provinceUID);
        res.json({
            status: 'success',
            data: result
        })
    }

    public async getProvinces(req: Request, res: Response) {

        const result = await this._locationsService.getProvince();

        res.json({
            status: 'success',
            data: result
        })
    }
}