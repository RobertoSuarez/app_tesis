
import { config } from "../../shared/config/config";
import { Domain } from "../../domain";
import { PostgreSQLAdapter } from "../../infrastructure/postgresql";
import { SQLiteAdapter } from "../../infrastructure/sqlite"
import { ExpressAdapter } from "./express";

const main = () => {
    const dbAdapter = new SQLiteAdapter();
    const postgreSQLAdapter = new PostgreSQLAdapter(config.dbUrl);
    const domain = new Domain(postgreSQLAdapter);
    const expressAdapter = new ExpressAdapter(domain);
    expressAdapter.listen(Number(config.appPort));
}

main();