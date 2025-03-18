import { Router } from "express";
import { ChartsController } from "../controllers/charts.controller";


export const initChartsRoutes = (chartsController: ChartsController) => {

    const router = Router();

    router.get('/kpi', (req, res) => chartsController.getKPI(req, res));

    return router;


}