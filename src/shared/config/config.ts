import dotenv from 'dotenv';

dotenv.config();

const config = {
    appPort: process.env.APP_PORT ?? 3000,
    dbUrl: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
}

export { config };