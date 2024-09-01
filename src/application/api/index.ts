
import { config } from "../../shared/config/config";
import { Domain } from "../../domain";

import { ExpressAdapter } from "./express";
import { PostgreSQLAdapter } from "../../infrastructure/persistence/postgresql";

const main = async () => {
    const pgAdapter = new PostgreSQLAdapter(config.dbUrl);
    await pgAdapter.setup();
    const domain = new Domain(pgAdapter, null, null);
    const expressAdapter = new ExpressAdapter(domain);
    expressAdapter.listen(Number(config.appPort));
}

main();