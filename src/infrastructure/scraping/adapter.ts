import { CompuTrabajoScrapingI, LinkedinScrapingI } from "../../domain/ports/jobs.port";


export interface ScrapingAdapterI {
    linkedinScraping: LinkedinScrapingI;
    compuTrabajoScraping: CompuTrabajoScrapingI;
}