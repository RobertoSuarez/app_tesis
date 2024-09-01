import { launch, Browser } from 'puppeteer';
import { CompuTrabajoScrapingI, LinkedinScrapingI } from "../../domain/ports/jobs.port";
import { ScrapingAdapterI } from "./adapter";
import { CompuTrabajoScraping } from "./puppeteer/compuTrabajoScraping.imp";
import { LinkedinScraping } from "./puppeteer/linkedinScraping.imp";
import OpenAI from 'openai';
import { config } from '../../shared/config/config';

export class ScrapingAdapter implements ScrapingAdapterI {
    linkedinScraping: LinkedinScrapingI;
    compuTrabajoScraping: CompuTrabajoScrapingI;

    browser: Browser;
    
    // Aquí podemos configurar el puppeteer.
    constructor() {
        
    }

    async setupBrowser() {

        const openai = new OpenAI({
            apiKey: config.OPENAI_API_KEY,
        });

        this.browser = await launch({
            headless: false,
            executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.linkedinScraping = new LinkedinScraping(this.browser);
        this.compuTrabajoScraping = new CompuTrabajoScraping(this.browser, openai);
        
    }

    async closeBrowser() {

       await this.browser.close();
    }


}