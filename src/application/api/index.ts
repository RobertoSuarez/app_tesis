
import { config } from "../../shared/config/config";
import { Domain } from "../../domain";

import { ExpressAdapter } from "./express";
import { PostgreSQLAdapter } from "../../infrastructure/persistence/postgresql";
import { ScrapingAdapter } from "../../infrastructure/scraping";

const main = async () => {
    const pgAdapter = new PostgreSQLAdapter(config.dbUrl);
    await pgAdapter.setup();
    const scrapingAdapter = new ScrapingAdapter();
    await scrapingAdapter.setupBrowser();
    const domain = new Domain(pgAdapter, scrapingAdapter, null);
    const expressAdapter = new ExpressAdapter(domain);
    expressAdapter.listen(Number(config.appPort));
}

main();