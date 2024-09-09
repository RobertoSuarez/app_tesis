import { CompuTrabajoScrapingI, LinkedinScrapingI, MultitrabajosScrapingI } from "../../domain/ports/jobs.port";


export interface ScrapingAdapterI {
    linkedinScraping: LinkedinScrapingI;
    compuTrabajoScraping: CompuTrabajoScrapingI;
    multitrabajoScraping: MultitrabajosScrapingI;
}