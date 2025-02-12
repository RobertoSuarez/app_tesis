import { ServerExpress } from "./infrastructure/api/server";

const PORT = process.env.PORT || 3000;

const main = async () => {
    const server = new ServerExpress();
    await server.initialize();
    server.app.listen(PORT, () => {
        console.log(`Servidor listo en el puerto: ${PORT}`);
    });
}

main();