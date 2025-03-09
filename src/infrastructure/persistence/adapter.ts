import { JobsRepositoryI } from "../../core/domain/ports/jobs.port";
import { PlatformsRepositoryI } from "../../core/domain/ports/platforms.port";
import { SearchRepositoryI } from "../../core/domain/ports/search.port";
import { JobsRepository } from "./postgresql/repository/jobs.imp";

export interface PersistenceAdapterI {
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepository;
    searchRepository: SearchRepositoryI;
}