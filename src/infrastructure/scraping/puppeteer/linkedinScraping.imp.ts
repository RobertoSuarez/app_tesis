import { Browser } from 'puppeteer'
import { Jobs } from "../../../domain/models/jobs.entity";
import { LinkedinScrapingI } from "../../../domain/ports/jobs.port";
import { Client } from 'linkedin-private-api';



export class LinkedinScraping implements LinkedinScrapingI {

    // browser: Browser;
    username: string;
    password: string;

    
    
    constructor(
        private _username: string, 
        private _password: string
    ) {
    }    

    async getJobs(query: string): Promise<Jobs[]> {

        const client = new Client();
        await client.login.userPass({ username: this._username, password: this._password });
        const jobsScroller = await client.search.searchJobs({
            keywords: query,
            limit: 10,
        });

        const [jobs] = await jobsScroller.scrollNext();

        return [];
    }

    
    // async getJob(url: string): Promise<Jobs> {
    //     const page = await this.browser.newPage();
    //     await page.goto(url, {waitUntil: 'networkidle0'});

    //     page.close();
    //     return null;
    // }


}