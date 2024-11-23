
import { config } from "../../shared/config/config";
import { Domain } from "../../domain";

import { ExpressAdapter } from "./express";
import { PostgreSQLAdapter } from "../../infrastructure/persistence/postgresql";
import { ScrapingAdapter } from "../../infrastructure/scraping";

const main = async () => {

    // Instanciamos un objecto del Adaptador PostgreSQL
    const pgAdapter = new PostgreSQLAdapter(config.dbUrl);
    await pgAdapter.setup();

    const scrapingAdapter = new ScrapingAdapter();
    
    // Instancia del dominio, donde estan todos los servicios.
    const domain = new Domain(pgAdapter, scrapingAdapter);
    const expressAdapter = new ExpressAdapter(domain);
    expressAdapter.listen(Number(config.appPort));
}

main();