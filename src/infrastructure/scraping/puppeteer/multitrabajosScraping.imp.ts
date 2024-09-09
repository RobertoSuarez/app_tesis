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



    async getJob(url: string): Promise<Jobs> {
        let job = new Jobs();

        const page = await this._browser.newPage();

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

                return {
                    title,
                    company,
                    location,
                    workType,
                    workScheduleType,
                    description
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

        job = await this.completeJobWithAI(job);
        console.log(job);

        return job;
    }

    async completeJobWithAI(job: Jobs): Promise<Jobs> {
        const datos = z.object({
            levelExperience: z.string(),
            description: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
        })

        const completion = await this._openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
                { role: 'system', content: 'Extraer información de la oferta de empleo. Las respuesta siempre dámela en español, y la descripción dale una mejor estructura' },
                { role: 'user', content: `
                    I have the following job offer:
                    Job title: ${job.title}
                    Company: ${job.Company}
                    Location: ${job.Location}
                    Work type: ${job.workType}
                    Work schedule type: ${job.workScheduleType}
                    Description: ${job.description}
                    `},
            ],
            response_format: zodResponseFormat(datos, 'details')
        })
        const details = completion.choices[0].message.parsed;
        job.levelExperience = details.levelExperience;
        job.attitudes = details.attitudes;
        job.salaryRange = details.salaryRange;
        job.disabilityInclusion = details.disabilityInclusion;
        job.description = details.description;
        console.log(details);
        console.log(job);

        return job;
    }


}