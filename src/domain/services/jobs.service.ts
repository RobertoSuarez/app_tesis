import { CompuTrabajoScrapingI, JobsRepositoryI, JobsServiceI, LinkedinScrapingI } from "../ports/jobs.port";



export class JobsService implements JobsServiceI {

    jobsRepository: JobsRepositoryI;
    linkedinScraping: LinkedinScrapingI;
    computrabajoScraping: CompuTrabajoScrapingI;

    constructor(jobsRepository: JobsRepositoryI, linkedinScraping: LinkedinScrapingI, compuTrabajoScraping: CompuTrabajoScrapingI) {
        this.jobsRepository = jobsRepository;
        this.linkedinScraping = linkedinScraping;
        this.computrabajoScraping = compuTrabajoScraping;
    }

    async webScrapingJobs(amountScraping: number): Promise<void> {

        const jobsUrls = [
            'https://ec.computrabajo.com/trabajo-de-node-js#5E3ADD5E2298344D61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-angular#B75D475F93C3D0E961373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-angular#05B979F106404D1461373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-angular#73F200BCC3CE605C61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-react#73F200BCC3CE605C61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-react#6AEE0BD7F28E783261373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-java#CFDEEF1E63DCED6C61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-python#3E232E59B5C9B88F61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-python#E1827A877957D09A61373E686DCF3405',
            'https://ec.computrabajo.com/trabajo-de-ruby#7E95DC4C54AE5E4561373E686DCF3405'
        ];

        for (let i = 0; i < jobsUrls.length; i++) {
            const job = await this.computrabajoScraping.getJob(jobsUrls[i]);
            await this.jobsRepository.registerJob(job);
        }
        
        return;
    }


}