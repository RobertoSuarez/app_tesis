import { PaginationQueryDto, PaginationResponseDto } from "../../domain/dtos/paginator.dtos";
import { CreatePlatformDto } from "../../domain/dtos/platforms.dtos";
import { Platforms } from "../../domain/entities/platforms.entity";
import { PlatformsRepositoryI, PlatformsServiceI } from "../../domain/ports/platforms.port";


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