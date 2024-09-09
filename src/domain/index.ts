import { PersistenceAdapterI } from "../infrastructure/persistence/adapter";
import { ScrapingAdapterI } from "../infrastructure/scraping/adapter";
import { SearchAdapterI } from "../infrastructure/search/adapter";
import { JobsServiceI } from "./ports/jobs.port";
import { PlatformsServiceI } from "./ports/platforms.port";
import { JobsService } from "./services/jobs.service";
import { PlatformsService } from './services/platforms.service';


interface ProviderServices {
    platformsService: PlatformsServiceI
    jobsServiceI: JobsServiceI
}

export class Domain {
    
    public providersServices: ProviderServices;
    

    constructor(persistenceAdapter: PersistenceAdapterI, scrapingAdapter: ScrapingAdapterI, searchAdapter: SearchAdapterI) {

        this.providersServices = {
            platformsService: new PlatformsService(persistenceAdapter.platformsRepository),
            jobsServiceI: new JobsService(
                persistenceAdapter.jobsRepository, 
                persistenceAdapter.searchRepository,
                scrapingAdapter.linkedinScraping, 
                scrapingAdapter.compuTrabajoScraping,
                scrapingAdapter.multitrabajoScraping,
            )
        }
    }
}