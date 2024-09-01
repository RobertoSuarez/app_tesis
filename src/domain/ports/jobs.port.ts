import { Jobs } from "../models/jobs.entity";


export interface JobsRepositoryI {
    registerJob(job: Jobs): Promise<Jobs>;
}

export interface LinkedinScrapingI {
    getJob(url: string): Promise<Jobs>
}

export interface CompuTrabajoScrapingI {
    getJob(url: string): Promise<Jobs>
}

export interface SearchEngineI {
    
}

export interface JobsServiceI {
    webScrapingJobs(amountScraping: number): Promise<void> 
}