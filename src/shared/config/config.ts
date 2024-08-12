import dotenv from 'dotenv';

dotenv.config();

const config = {
    appPort: process.env.APP_PORT ?? 3000,
    dbUrl: process.env.DATABASE_URL,
}

export { config };