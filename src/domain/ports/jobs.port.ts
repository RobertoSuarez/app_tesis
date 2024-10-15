import { Jobs } from "../models/jobs.entity";


export interface JobsRepositoryI {
    scraped(url: string): Promise<boolean>;
    registerJob(job: Jobs): Promise<Jobs>;
}

export interface LinkedinScrapingI {
    getJobs(query: string): Promise<Jobs[]>
}

export interface CompuTrabajoScrapingI {
    getJob(url: string): Promise<Jobs>
}

export interface MultitrabajosScrapingI {
    getJob(url: string): Promise<Jobs>
    searchJobs(query: string): Promise<string[]> 
}

export interface SearchEngineI {
    
}

export interface JobsServiceI {
    webScrapingJobs(amountScraping: number): Promise<void> 
    test(query: string): Promise<void>
}