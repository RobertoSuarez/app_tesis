import { DataSource, Repository } from "typeorm";
import { JobsRepositoryI } from "../../../../domain/ports/jobs.port";
import { Jobs } from "../../../../domain/models/jobs.entity";


export class JobsRepository implements JobsRepositoryI {

    repositoryJobs: Repository<Jobs>

    constructor(private _client: DataSource) {
        this.repositoryJobs = this._client.getRepository(Jobs);
    }

    async scraped(url: string): Promise<boolean> {
        const job = await this.repositoryJobs.findOne({ where: { URL: url }});
        if (!job) {
            return false;
        }

        return true;
    }

    async registerJob(job: Jobs): Promise<Jobs> {
        return await this.repositoryJobs.save(job);
    }
}