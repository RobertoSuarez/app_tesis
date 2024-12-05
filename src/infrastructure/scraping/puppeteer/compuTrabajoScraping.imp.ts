import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { Browser, Page } from "puppeteer";
import { Jobs } from '../../../domain/models/jobs.entity';
import { CompuTrabajoScrapingI } from "../../../domain/ports/jobs.port";
import { Platforms } from "../../../domain/models/platforms.entity";


export class CompuTrabajoScraping implements CompuTrabajoScrapingI {


    constructor(
        private _browser: Browser,
        private _openai: OpenAI
    ) {
    }

    // getURLs recupera todas las urls de las ofertas que aparecen en la búsqueda.
    async getURLs(search: string): Promise<string[]> {        
        let page: Page = null; 
        try {
            page = await this._browser.newPage();
            const url = `https://ec.computrabajo.com/trabajo-de-${search.replace(/\s+/g, '-')}`;
            await page.goto(url, { waitUntil: 'networkidle0' });

            const data = await page.evaluate(() => {
                let urls = [];
                // Recuperamos todos los elementos a de las ofertas de empleo.
                const listaOfertas = document.querySelectorAll('#offersGridOfferContainer a.js-o-link') as NodeListOf<HTMLAnchorElement>;
                // iteramos para sacar la ruta
                for (let i = 0; i < listaOfertas.length; i++) {
                    const url = listaOfertas[i].href;
                    urls.push(url);
                }
                return urls;

            });
            return Promise.resolve(data as string[]);
        } catch (err) {
            console.error(err);
        } finally {
            await page.close();
        }
    }

    async getJob(url: string): Promise<Jobs> {
        let job = new Jobs();

        let page: Page;

        try {
            
            page = await this._browser.newPage();
            page.setViewport({
                height: 1080,
                width: 1920
            })
    
            await page.goto(url, {waitUntil: 'networkidle0'});
    
            const data = await page.evaluate(() => {

                try {
                    const title = document.querySelector('.box_detail').textContent.trim()
                    const company = document.querySelector('.box_detail a').textContent.trim()
                    const location = document.querySelector('.detail_fs .container p').textContent.trim()
                    const description = document.querySelector('.box_detail [div-link="oferta"]').textContent.trim();
                    const tags = document.querySelectorAll('.tag.base.mb10')
                    const workType = tags[1].textContent.trim();
                    const workScheduleType = tags[2].textContent.trim();
                    // const workScheduleType = details[1].textContent.trim()
                    // const description = document.querySelectorAll('.box_detail .fs16')[4].textContent.trim();
        
        
                    return {
                        title,
                        company,
                        location,
                        workType,
                        workScheduleType,
                        description
                    }

                } catch(error) {
                    console.log(error);
                    return null;
                }
    
    
            })

            if (!data) {
                throw new Error('Data not found');
            }
            job.title = data.title;
            job.Company = data.company;
            job.Location = data.location;
            job.workType = data.workType;
            job.workScheduleType = data.workScheduleType;
            job.description = data.description;
            job.URL = url;
            job.scrapedAt = new Date();
            const platform = new Platforms();
            platform.uid = '29fca5d9-2fc2-4baa-bfb2-28a67efd0a17';
    
            job.platform = platform;
    
            job = await this.completeJobWithAI(job);
        } catch (error) {
            
            console.log(error);
            throw error;
        } finally {
            await page.close();
        }
        

        return job;
    }


    async completeJobWithAI(job: Jobs): Promise<Jobs> {
        const datos = z.object({
            levelExperience: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
            location: z.string(),
            company: z.string(),
            hasSalaryRange: z.boolean(),
            salaryMax: z.number(),
            salaryMin: z.number(),
        })

        const completion = await this._openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
                { role: 'system', content: 'Extraer información de la oferta de empleo. Las respuesta siempre damela en español' },
                { role: 'user', content: `
                    I have the following job offer:
                    Empresa y localización: ${job.Location}
                    Job title: ${job.title}
                    Description: ${job.description}
                    `},
            ],
            response_format: zodResponseFormat(datos, 'details')
        })
        const details = completion.choices[0].message.parsed;
        job.levelExperience = details.levelExperience;
        job.attitudes = details.attitudes;
        job.hasSalaryRange = details.hasSalaryRange;
        job.salaryMin = details.salaryMin;
        job.salaryMax = details.salaryMax;
        job.disabilityInclusion = details.disabilityInclusion;
        job.Location = details.location;
        job.Company = details.company;

        return job;
    }
}