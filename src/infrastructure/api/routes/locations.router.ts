import { Router } from "express";
import { LocationsController } from "../controllers/locations.controller";


export const initLocationsRoutes = (locationsController: LocationsController) => {

    const router = Router();
    router.get('/cities/:provinceUID', (req, res) => locationsController.getCities(req, res));
    router.get('/provinces', (req, res) => locationsController.getProvinces(req, res));
    return router;
}