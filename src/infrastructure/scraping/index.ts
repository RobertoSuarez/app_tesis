import { launch, Browser } from 'puppeteer';
import { CompuTrabajoScrapingI, LinkedinScrapingI, MultitrabajosScrapingI } from "../../domain/ports/jobs.port";
import { ScrapingAdapterI } from "./adapter";
import { CompuTrabajoScraping } from "./puppeteer/compuTrabajoScraping.imp";
import { LinkedinScraping } from "./puppeteer/linkedinScraping.imp";
import OpenAI from 'openai';
import { config } from '../../shared/config/config';
import { MultitrabajosScraping } from './puppeteer/multitrabajosScraping.imp';

export class ScrapingAdapter implements ScrapingAdapterI {
    linkedinScraping: LinkedinScrapingI;
    compuTrabajoScraping: CompuTrabajoScraping;
    multitrabajoScraping: MultitrabajosScraping;

    browser: Browser;
    
    // Aquí podemos configurar el puppeteer.
    constructor() {
        
    }

    async setupBrowser() {

        let path = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        if (process.platform === 'linux') {
            path = '/usr/bin/chromium-browser';
        }

        const openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });

        this.browser = await launch({
            headless: false,
            executablePath: path,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,720'],
            timeout: 0,
        });

        const username = config.LINKEDIN_USERNAME;
        const password = config.LINKEDIN_PASSWORD;

        this.linkedinScraping = new LinkedinScraping(username, password);
        this.compuTrabajoScraping = new CompuTrabajoScraping(this.browser, openai);
        this.multitrabajoScraping = new MultitrabajosScraping(this.browser, openai);
    }

    async closeBrowser() {

       await this.browser.close();
    }


}