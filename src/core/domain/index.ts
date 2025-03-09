import { PostgreSQLAdapter } from "../../infrastructure/persistence/postgresql";
import { ScrapingAdapter } from "../../infrastructure/scraping";
import { PlatformsServiceI } from "./ports/platforms.port";
import { JobsService } from "../application/services/jobs.service";
import { PlatformsService } from '../application/services/platforms.service';
import { UserService } from "../application/services/user.service";
import { JobLikesService } from "../application/services/JobLikes.service";

// TODO: En ves de que exita una interface como proveedor seria bueno colocar directamente en el 
// dominio cada una des las instancias de los servicios.
interface ProviderServices {
    platformsService: PlatformsServiceI
    jobsService: JobsService
    userService: UserService
    jobLikesService: JobLikesService
}

export class Domain {

    public providersServices: ProviderServices;


    constructor(persistenceAdapter: PostgreSQLAdapter, scrapingAdapter: ScrapingAdapter) {

        const platformsService = new PlatformsService(persistenceAdapter.platformsRepository);
        const userService = new UserService(persistenceAdapter.client);
        const jobLikesService = new JobLikesService(persistenceAdapter.client);


        this.providersServices = {
            platformsService,
            jobsService: null,
            userService,
            jobLikesService,
        }
    }
}