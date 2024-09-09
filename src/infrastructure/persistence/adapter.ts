import { JobsRepositoryI } from "../../domain/ports/jobs.port";
import { PlatformsRepositoryI } from "../../domain/ports/platforms.port";
import { SearchRepositoryI } from "../../domain/ports/search.port";

export interface PersistenceAdapterI {
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepositoryI;
    searchRepository: SearchRepositoryI;
}