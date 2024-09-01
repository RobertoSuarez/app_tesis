import { DataSource, Repository } from "typeorm";
import { JobsRepositoryI } from "../../../../domain/ports/jobs.port";
import { Jobs } from "../../../../domain/models/jobs.entity";


export class JobsRepository implements JobsRepositoryI {

    repository: Repository<Jobs>

    constructor(private _client: DataSource) {
        this.repository = this._client.getRepository(Jobs);
    }

    async registerJob(job: Jobs): Promise<Jobs> {
        return await this.repository.save(job);
    }
}