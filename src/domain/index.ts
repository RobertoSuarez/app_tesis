import { PersistenceAdapterI } from "../infrastructure/persistence/adapter";
import { PostgreSQLAdapter } from "../infrastructure/persistence/postgresql";
import { ScrapingAdapter } from "../infrastructure/scraping";
import { ScrapingAdapterI } from "../infrastructure/scraping/adapter";
import { SearchAdapterI } from "../infrastructure/search/adapter";
import { PlatformsServiceI } from "./ports/platforms.port";
import { JobsService } from "./services/jobs.service";
import { PlatformsService } from './services/platforms.service';
import { UserService } from "./services/user.service";

// TODO: En ves de que exita una interface como proveedor seria bueno colocar directamente en el 
// dominio cada una des las instancias de los servicios.
interface ProviderServices {
    platformsService: PlatformsServiceI
    jobsService: JobsService
    userService: UserService
}

export class Domain {
    
    public providersServices: ProviderServices;
    

    constructor(persistenceAdapter: PostgreSQLAdapter, scrapingAdapter: ScrapingAdapter) {

        const platformsService = new PlatformsService(persistenceAdapter.platformsRepository);
        const userService = new UserService(persistenceAdapter.client);
        const jobsService = new JobsService(
            persistenceAdapter.jobsRepository, 
            persistenceAdapter.searchRepository,
            scrapingAdapter.linkedinScraping, 
            scrapingAdapter.compuTrabajoScraping,
            scrapingAdapter.multitrabajoScraping,
            userService,
            persistenceAdapter.client,
        );

        this.providersServices = {
            platformsService,
            jobsService,
            userService,
        }
    }
}