import { JobsService } from "./application/services/jobs.service";
import { UserService } from "./application/services/user.service";
import { AuthController } from "./infrastructure/api/controllers/auth.controller"
import { JobsController } from "./infrastructure/api/controllers/job.controller";
import { ConnectionDB } from "./infrastructure/database/connection";
import { config } from "./shared/config/config";

export interface ControllerProvider {
    authController: AuthController;
    jobsController: JobsController;
}


// aqui vamos a crear el proveedor de controladores
export const createProvider = async (): Promise<ControllerProvider> => {

    const db = new ConnectionDB(config.dbUrl);
    await db.setup();
    
    const userService = new UserService(db.client);
    const jobsService = new JobsService(db.client, userService, null, null);
    
    const authController = new AuthController(userService);
    const jobsController = new JobsController(jobsService);
    
    const provider: ControllerProvider = {
        authController:  authController,
        jobsController: jobsController,
    }

    return provider;
}