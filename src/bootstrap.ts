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

export interface ControllerProvider {
    authController: AuthController;
    jobsController: JobsController;
    userController: UserController;
    jobLikesController: JobLikesController;
    notificationsController: NotificationsController;
}


// aqui vamos a crear el proveedor de controladores
export const createProvider = async (): Promise<ControllerProvider> => {

    let path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    if (process.platform === 'linux') {
        path = '/usr/bin/chromium';

        // path = '/usr/bin/chromium-browser';

    }

    puppeteer.use(StealthPlugin());

    const openai = new OpenAI({
        apiKey: config.OPENAI_API_KEY,
    })

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
    if (config.BROWSER_CLOSE) {
        browser.close();
    }

    const db = new ConnectionDB(config.dbUrl);
    await db.setup();

    // Instancia de scraping.
    const computrabajoScraping = new CompuTrabajoScraping(browser, openai);
    const multitrabajoScraping = new MultitrabajosScraping(browser, openai);

    const userService = new UserService(db.client);
    const jobsService = new JobsService(db.client, userService, computrabajoScraping, multitrabajoScraping);
    const jobHistoryService = new JobHistoryService(db.client);
    const educationService = new EducationService(db.client);
    const languageService = new LanguageService(db.client);
    const jobLikesService = new JobLikesService(db.client);
    const notificationsService = new NotificationsService(db.client);

    const authController = new AuthController(userService);
    const jobsController = new JobsController(jobsService);
    const userController = new UserController(userService, jobHistoryService, educationService, languageService);
    const jobLikesController = new JobLikesController(jobLikesService);
    const notificationsController = new NotificationsController(notificationsService);

    const provider: ControllerProvider = {
        authController: authController,
        jobsController: jobsController,
        userController: userController,
        jobLikesController,
        notificationsController,

    }

    return provider;
}