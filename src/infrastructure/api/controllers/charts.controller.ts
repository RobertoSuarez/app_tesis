import { Request, Response } from "express";
import { ChartsService } from "../../../core/application/services/charts.service";



export class ChartsController {

    constructor(
        private _chartsService: ChartsService
    ) { }


    public async getKPI(req: Request, res: Response) {
        try {
            const result = await this._chartsService.getKPI();
            res.json({
                status: 'success',
                data: result
            });
        } catch (error) {
            console.error("Error en getKPI:", error);
            res.status(400).json({
                status: 'error',
                message: error.message
            });
        }
    }

}