import { PaginationQueryDto, PaginationResponseDto } from "../dtos/paginator.dtos";
import { CreatePlatformDto } from "../dtos/platforms.dtos";
import { Platforms } from "../models/platforms.entity";
import { PlatformsRepositoryI, PlatformsServiceI } from "../ports/platforms.port";


export class PlatformsService implements PlatformsServiceI {

    platformRepository: PlatformsRepositoryI;

    constructor(platformRepository: PlatformsRepositoryI) {
        this.platformRepository = platformRepository;
    }

    async registerPlatform(createPlatform: CreatePlatformDto): Promise<Platforms> {
        return await this.platformRepository.createPlatform(createPlatform);
    }

    async getPlatforms(paginationQuery: PaginationQueryDto): Promise<PaginationResponseDto<Platforms>> {
        return await this.platformRepository.getPlatforms(paginationQuery);
    }
    
}