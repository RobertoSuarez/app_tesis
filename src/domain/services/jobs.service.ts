import axios from "axios";
import url from 'url';
import { CompuTrabajoScrapingI, JobsRepositoryI, JobsServiceI, LinkedinScrapingI, MultitrabajosScrapingI } from "../ports/jobs.port";
import { SearchRepositoryI } from "../ports/search.port";
import { Jobs } from "../models/jobs.entity";
import { config } from "../../shared/config/config";



export class JobsService implements JobsServiceI {


    constructor(
        private _jobsRepository: JobsRepositoryI, 
        private _searchRepository: SearchRepositoryI,
        private _linkedinScraping: LinkedinScrapingI, 
        private _compuTrabajoScraping: CompuTrabajoScrapingI,
        private _multitrabajosScraping: MultitrabajosScrapingI,
    ) 
    {
    }


    async test(query: string): Promise<void> {
        const job = await this._multitrabajosScraping.getJob(query);
        console.log(job);
    }

 

    async webScrapingJobs(amountScraping: number): Promise<void> {

        const lastSearch = await this._searchRepository.lastSearch(amountScraping);
        if (!lastSearch || lastSearch.length === 0) {
            return;
        }

        const keyGoogle = config.GCP_KEY;
        const searchEngineId = config.SEARCH_ENGINE_ID;

        for (let index = 0; index < lastSearch.length; index++) {
            // TODO: Extraer 10 urls de la búsqueda
            const currentSearch = lastSearch[index];

            const multitrabajosUrls = await this._multitrabajosScraping.searchJobs(currentSearch.query);

            console.log('multitrabajosUrls', multitrabajosUrls);

            try {
                // const params = {
                //     key: keyGoogle,
                //     cx: searchEngineId,
                //     q: encodeURIComponent(currentSearch.query),
                //     num: 10,
                // }
                // const url = `https://www.googleapis.com/customsearch/v1`;

                // Aplicamos que ya se ha buscado el termino
                await this._searchRepository.sought(currentSearch.uid);


                // const response = await axios.get(url, { params });
                
                // const items = response.data.items;
                // if (!items) {
                //     continue;
                // }
                // let urls = items.map((item: any) => item.link)
                // console.log(urls);

                // TODO: Quitar eso, se coloca esto solo por testeo
                // urls = [];

                for (let indexUrl = 0; indexUrl < multitrabajosUrls.length; indexUrl++) {

                    try {
                        const url = multitrabajosUrls[indexUrl];
                        const ok = await this._jobsRepository.scraped(url);
                        if (ok) {
                            continue;
                        }

                        let job: Jobs = null;
                        const platform = this.getPlatform(url);
                        switch (platform) {
                            case 'multitrabajos':
                                job = await this._multitrabajosScraping.getJob(url);
                                break;
                            case 'computrabajo':
                                job = await this._compuTrabajoScraping.getJob(url);
                                break;
                            default:
                                continue;
                        }

                        
                        await this._jobsRepository.registerJob(job);
                    } catch (err) {
                        console.log(err);
                    } finally {
                        continue;
                    }
                    
                }


                
                
            } catch (err) {
                console.log(err);
                throw err;
            }
        }

        // const jobsUrls = [
        //     'https://ec.computrabajo.com/trabajo-de-node-js#5E3ADD5E2298344D61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-angular#B75D475F93C3D0E961373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-angular#05B979F106404D1461373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-angular#73F200BCC3CE605C61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-react#73F200BCC3CE605C61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-react#6AEE0BD7F28E783261373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-java#CFDEEF1E63DCED6C61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-python#3E232E59B5C9B88F61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-python#E1827A877957D09A61373E686DCF3405',
        //     'https://ec.computrabajo.com/trabajo-de-ruby#7E95DC4C54AE5E4561373E686DCF3405'
        // ];

        // for (let i = 0; i < jobsUrls.length; i++) {
        //     const job = await this._compuTrabajoScraping.getJob(jobsUrls[i]);
        //     await this._jobsRepository.registerJob(job);
        // }
        
        return;
    }

    getPlatform(urlStr: string) {
        if (urlStr.includes('linkedin')) {
            return 'linkedin';
        }

        if (urlStr.includes('computrabajo')) {
            return 'computrabajo';
        }

        if (urlStr.includes('multitrabajos')) {
            return 'multitrabajos';
        }

        return null;
    }


}