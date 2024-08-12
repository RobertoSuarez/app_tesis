import { Domain } from "../../domain";
import { PostgreSQLAdapter } from "../../infrastructure/postgresql";
import { config } from "../../shared/config/config";

const main = async () => {
    const postgresSQLAdapter = new PostgreSQLAdapter(config.dbUrl);
    await postgresSQLAdapter.setup();
    const domain = new Domain(postgresSQLAdapter);
    const weather = await domain.port.WeatherUseCase.current();
    console.log(weather);
}

main();