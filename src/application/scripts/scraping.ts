import { Domain } from "../../domain";
import { PostgreSQLAdapter } from "../../infrastructure/persistence/postgresql";
import { ScrapingAdapter } from "../../infrastructure/scraping";
import { config } from "../../shared/config/config";

const main = async () => {
    const SQLAdapter = new PostgreSQLAdapter(config.dbUrl);
    await SQLAdapter.setup();
    const scrapingAdapter = new ScrapingAdapter();
    await scrapingAdapter.setupBrowser();
    const domain = new Domain(SQLAdapter, scrapingAdapter, null);
    await domain.providersServices.jobsServiceI.webScrapingJobs(20);
    // await domain.providersServices.jobsServiceI.test('https://www.multitrabajos.com/empleos/supervisor-de-ventas-all-natural-1116458289.html');
    await scrapingAdapter.closeBrowser();
}

main();