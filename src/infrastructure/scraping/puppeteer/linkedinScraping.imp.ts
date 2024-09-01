import { Browser } from 'puppeteer'
import { Jobs } from "../../../domain/models/jobs.entity";
import { LinkedinScrapingI } from "../../../domain/ports/jobs.port";



export class LinkedinScraping implements LinkedinScrapingI {

    browser: Browser;
    
    constructor(browser: Browser) {
        this.browser = browser;
    }

    
    async getJob(url: string): Promise<Jobs> {
        const page = await this.browser.newPage();
        await page.goto(url, {waitUntil: 'networkidle0'});

        page.close();
        return null;
    }


}