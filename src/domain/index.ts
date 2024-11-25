import { PersistenceAdapterI } from "../infrastructure/persistence/adapter";
import { PostgreSQLAdapter } from "../infrastructure/persistence/postgresql";
import { ScrapingAdapterI } from "../infrastructure/scraping/adapter";
import { SearchAdapterI } from "../infrastructure/search/adapter";
import { PlatformsServiceI } from "./ports/platforms.port";
import { JobsService } from "./services/jobs.service";
import { PlatformsService } from './services/platforms.service';
import { UserService } from "./services/user.service";


interface ProviderServices {
    platformsService: PlatformsServiceI
    jobsService: JobsService
    userService: UserService
}

export class Domain {
    
    public providersServices: ProviderServices;
    

    constructor(persistenceAdapter: PostgreSQLAdapter, scrapingAdapter: ScrapingAdapterI) {

        const platformsService = new PlatformsService(persistenceAdapter.platformsRepository);
        const userService = new UserService(persistenceAdapter.client);
        const jobsService = new JobsService(
            persistenceAdapter.jobsRepository, 
            persistenceAdapter.searchRepository,
            scrapingAdapter.linkedinScraping, 
            scrapingAdapter.compuTrabajoScraping,
            scrapingAdapter.multitrabajoScraping,
            userService,
        );

        this.providersServices = {
            platformsService,
            jobsService,
            userService,
        }
    }
}