import { CompuTrabajoScrapingI, LinkedinScrapingI, MultitrabajosScrapingI } from "../../core/domain/ports/jobs.port";


export interface ScrapingAdapterI {
    linkedinScraping: LinkedinScrapingI;
    compuTrabajoScraping: CompuTrabajoScrapingI;
    multitrabajoScraping: MultitrabajosScrapingI;
}