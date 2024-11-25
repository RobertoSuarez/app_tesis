import dotenv from 'dotenv';

dotenv.config();

const config = {
    appPort: process.env.APP_PORT ?? 3000,
    dbUrl: process.env.DATABASE_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LINKEDIN_USERNAME: process.env.LINKEDIN_USERNAME,
    LINKEDIN_PASSWORD: process.env.LINKEDIN_PASSWORD,
    GCP_KEY: process.env.GCP_KEY,
    SEARCH_ENGINE_ID: process.env.SEARCH_ENGINE_ID,
    KEY_JWT: process.env.KEY_JWT
}

export { config };