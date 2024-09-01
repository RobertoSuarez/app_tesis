import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { Browser } from "puppeteer";
import { Jobs } from '../../../domain/models/jobs.entity';
import { CompuTrabajoScrapingI } from "../../../domain/ports/jobs.port";
import { Platforms } from "../../../domain/models/platforms.entity";


export class CompuTrabajoScraping implements CompuTrabajoScrapingI {

    browser: Browser;
    openai: OpenAI;
    constructor(
        browser: Browser,
        openai: OpenAI
    ) {
        this.browser = browser;
        this.openai = openai;
    }

    async getJob(url: string): Promise<Jobs> {

        let job = new Jobs();
        
        const page = await this.browser.newPage();

        await page.goto(url, {waitUntil: 'networkidle0'});

        const data = await page.evaluate(() => {

            const title = document.querySelector('.box_detail .title_offer').textContent.trim()
            const company = document.querySelector('.box_detail a').textContent.trim()
            const location = document.querySelector('.box_detail .header_detail div .mb5').textContent.trim()
            const details = document.querySelectorAll('.box_detail .fs14.mb10 .dFlex.mb10')
            const workType = details[2].textContent.trim()
            const workScheduleType = details[1].textContent.trim()
            const description = document.querySelectorAll('.box_detail .fs16')[4].textContent.trim();


            return {
                title,
                company,
                location,
                workType,
                workScheduleType,
                description
            }

        })
        job.title = data.title;
        job.Company = data.company;
        job.Location = data.location;
        job.workType = data.workType;
        job.workScheduleType = data.workScheduleType;
        job.description = data.description;
        job.URL = url;
        job.scrapedAt = new Date();
        const platform = new Platforms();
        platform.uid = '91b64be6-bcb7-4a09-b88c-a664b6aec537';

        job.platform = platform;

        job = await this.completeJobWithAI(job);

        await page.close();


        return job;
    }


    async completeJobWithAI(job: Jobs): Promise<Jobs> {
        const datos = z.object({
            levelExperience: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
        })

        const completion = await this.openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini-2024-07-18',
            messages: [
                { role: 'system', content: 'Extraer información de la oferta de empleo. Las respuesta siempre damela en español' },
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
        console.log(details);
        console.log(job);

        return job;
    }
}