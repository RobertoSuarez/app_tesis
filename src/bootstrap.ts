import OpenAI from "openai";
import { AuthController } from "./infrastructure/api/controllers/auth.controller"
import { JobsController } from "./infrastructure/api/controllers/job.controller";
import { ConnectionDB } from "./infrastructure/database/connection";
import { CompuTrabajoScraping } from "./infrastructure/scraping/puppeteer/compuTrabajoScraping.imp";
import { config } from "./shared/config/config";
import { launch } from "puppeteer";
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { MultitrabajosScraping } from "./infrastructure/scraping/puppeteer/multitrabajosScraping.imp";
import { UserController } from "./infrastructure/api/controllers/user.controller";
import { UserService } from "./core/application/services/user.service";
import { JobsService } from "./core/application/services/jobs.service";
import { JobHistoryService } from "./core/application/services/jobHistory.service";
import { EducationService } from "./core/application/services/education.service";
import { LanguageService } from "./core/application/services/language.service";
import { JobLikesController } from "./infrastructure/api/controllers/jobLikes.controller";
import { JobLikesService } from "./core/application/services/JobLikes.service";
import { NotificationsController } from "./infrastructure/api/controllers/notifications.controller";
import { NotificationsService } from "./core/application/services/notifications.service";
import { LocationsService } from "./core/application/services/localitation.service";
import { LocationsController } from "./infrastructure/api/controllers/locations.controller";
import { ChartsService } from "./core/application/services/charts.service";
import { ChartsController } from "./infrastructure/api/controllers/charts.controller";

export interface ControllerProvider {
    authController: AuthController;
    jobsController: JobsController;
    userController: UserController;
    jobLikesController: JobLikesController;
    notificationsController: NotificationsController;
    locationsController: LocationsController;
    chartsController: ChartsController;
}


// aqui vamos a crear el proveedor de controladores
export const createProvider = async (): Promise<ControllerProvider> => {

    let path = 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe';
    if (process.platform === 'linux') {

        if (config.LOCAL) {
            path = '/usr/bin/chromium-browser';
        } else {
            path = '/usr/bin/chromium';
        }


    }

    puppeteer.use(StealthPlugin());

    const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
    })
    console.log('Config Local: ', config.LOCAL)
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: path,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--window-size=1280,720'
        ],
        timeout: 0,
    })

    // console.log(config.BROWSER_CLOSE);
    // if (config.BROWSER_CLOSE) {
    //     browser.close();
    // }

    const db = new ConnectionDB(config.dbUrl);
    await db.setup();

    // Instancia de scraping.
    const computrabajoScraping = new CompuTrabajoScraping(browser, openai);
    const multitrabajoScraping = new MultitrabajosScraping(browser, openai);

    const userService = new UserService(db.client);
    const jobHistoryService = new JobHistoryService(db.client);
    const educationService = new EducationService(db.client);
    const languageService = new LanguageService(db.client);
    const jobLikesService = new JobLikesService(db.client);
    const jobsService = new JobsService(db.client, userService, computrabajoScraping, multitrabajoScraping, jobLikesService);
    const notificationsService = new NotificationsService(db.client);
    const locationsService = new LocationsService(db.client);
    const chartsService = new ChartsService(db.client);

    const authController = new AuthController(userService);
    const jobsController = new JobsController(jobsService);
    const userController = new UserController(userService, jobHistoryService, educationService, languageService);
    const jobLikesController = new JobLikesController(jobLikesService);
    const notificationsController = new NotificationsController(notificationsService);
    const locationsController = new LocationsController(locationsService);
    const chartsController = new ChartsController(chartsService);

    const provider: ControllerProvider = {
        authController: authController,
        jobsController: jobsController,
        userController: userController,
        jobLikesController,
        notificationsController,
        locationsController,
        chartsController,
    }

    return provider;
}