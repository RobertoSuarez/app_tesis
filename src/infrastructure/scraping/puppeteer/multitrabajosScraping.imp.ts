import { Browser } from "puppeteer";
import { MultitrabajosScrapingI } from "../../../domain/ports/jobs.port";
import { Jobs } from "../../../domain/models/jobs.entity";
import OpenAI from "openai";
import { Platforms } from "../../../domain/models/platforms.entity";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";



export class MultitrabajosScraping implements MultitrabajosScrapingI {

    constructor(
        private _browser: Browser,
        private _openai: OpenAI
    ) {}

    async searchJobs(query: string): Promise<string[]> {

        const page = await this._browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720,
        })
        const url = `https://www.multitrabajos.com/empleos-busqueda-${query.trim().replace(/\s+/g, '-')}.html`
        await page.goto(url, { waitUntil: 'networkidle0' });

        let links = await page.evaluate(() => {
            const lista = document.querySelector('#listado-avisos').children;
            if (document.querySelector('#listado-avisos').innerHTML.includes('No encontramos')) {
                return null;
            }
            const result = [];
            for (let index = 0; index < lista.length; index++) {
                const element = lista[index];
                const href = element.querySelector('a').getAttribute('href');
                result.push(href);
            }
            return result;
        })

        await page.close();

        if (!links) {
            return [];
        }

        links = links.slice(0, -1).slice(0, 10);
        links = links.map(link => `https://www.multitrabajos.com${link}`);
        links = links.filter(url => /https:\/\/www\.multitrabajos\.com\/empleos\/.+-\d+\.html/.test(url))
        
        return links;
    }



    async getJob(url: string): Promise<Jobs> {
        let job = new Jobs();

        const page = await this._browser.newPage();
        await page.setViewport({
            width: 1280,
            height: 720,
        })

        await page.goto(url, { waitUntil: 'networkidle0' });

        // TODO: hacer el web scraping.

        const data = await page.evaluate(() => {

            try {
                const title = document.querySelector('#header-component h1')?.textContent.trim();
                const company = document.querySelector('#header-component div div span')?.textContent.trim();
                const location = document.querySelectorAll('#ficha-detalle h2')[1].textContent.trim();
                const workType = document.querySelectorAll('#ficha-detalle h2')[2].textContent.trim();
                const workScheduleType = document.querySelectorAll('#ficha-detalle h2')[4].textContent.trim();
                const description = document.querySelector('#ficha-detalle').textContent;
                const details = document.querySelector('#header-component').textContent;

                return {
                    title,
                    company,
                    location,
                    workType,
                    workScheduleType,
                    description,
                    details,
                }

            } catch (error) {
                console.log(error);
                return {
                    title: '',
                    company: '',
                    location: '',
                    workType: '',
                    workScheduleType: '',
                    description: ''
                }
            }
        });

        // Cerramos la pagina
        await page.close();

        job.title = data.title;
        job.Company = data.company;
        job.Location = data.location;
        job.workType = data.workType;
        job.workScheduleType = data.workScheduleType;
        job.description = data.description;
        job.URL = url;
        job.scrapedAt = new Date();

        const platform = new Platforms();
        platform.uid = '56f94243-74f1-4408-9ef5-ebb97bd615c1';

        job.platform = platform;

        job = await this.completeJobWithAI(job, data.details);

        return job;
    }

    async completeJobWithAI(job: Jobs, detailsExtras: string): Promise<Jobs> {
        const datos = z.object({
            levelExperience: z.string(),
            description: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
            company: z.string(),
            hasSalaryRange: z.boolean(),
            salaryMax: z.number(),
            salaryMin: z.number(),
        })

        const completion = await this._openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
                { role: 'system', content: 'Extraer información de la oferta de empleo. Las respuesta siempre dámela en español, y la descripción dale una mejor estructura' },
                { role: 'user', content: `
                    I have the following job offer:
                    Job title: ${job.title}
                    Location: ${job.Location}
                    Work type: ${job.workType}
                    Work schedule type: ${job.workScheduleType}
                    Description: ${job.description},
                    Datos extras: ${detailsExtras}
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
        job.description = details.description;
        job.Company = details.company;

        return job;
    }


}