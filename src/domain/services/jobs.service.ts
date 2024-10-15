import axios from "axios";
import url from 'url';
import { CompuTrabajoScrapingI, JobsRepositoryI, LinkedinScrapingI, MultitrabajosScrapingI } from "../ports/jobs.port";
import { SearchRepositoryI } from "../ports/search.port";
import { Jobs } from "../models/jobs.entity";
import { config } from "../../shared/config/config";



export class JobsService {


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
    }

    async getUrl(query: string): Promise<string[]> {
        const urls = await this._compuTrabajoScraping.getURLs(query);
        return urls;
    }

    async getUrlComputrabajo(query: string): Promise<string[]> {
        const urls = await this._compuTrabajoScraping.getURLs(query);
        return urls;
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
            const urls = await this._compuTrabajoScraping.getURLs(currentSearch.query);

            urls.concat(multitrabajosUrls);

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

                

                for (let indexUrl = 0; indexUrl < urls.length; indexUrl++) {

                    try {
                        const url = urls[indexUrl];
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