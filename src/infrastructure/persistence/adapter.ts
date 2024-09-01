import { JobsRepositoryI } from "../../domain/ports/jobs.port";
import { PlatformsRepositoryI } from "../../domain/ports/platforms.port";

export interface PersistenceAdapterI {
    platformsRepository: PlatformsRepositoryI;
    jobsRepository: JobsRepositoryI;
}