import { JobsRepositoryI } from "../../domain/ports/jobs.port";
import { PlatformsRepositoryI } from "../../domain/ports/platforms.port";
import { SearchRepositoryI } from "../../domain/ports/search.port";
import { JobsRepository } from "./postgresql/repository/jobs.imp";

export interface PersistenceAdapterI {
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepository;
    searchRepository: SearchRepositoryI;
}