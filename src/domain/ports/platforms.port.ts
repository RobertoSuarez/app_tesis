import { PaginationQueryDto, PaginationResponseDto } from "../dtos/paginator.dtos";
import { CreatePlatformDto } from "../dtos/platforms.dtos";
import { Platforms } from "../models/platforms.entity";


export interface PlatformsRepositoryI {
    createPlatform(createPlatform: CreatePlatformDto): Promise<Platforms>;
    getPlatforms(paginationQuery: PaginationQueryDto): Promise<PaginationResponseDto<Platforms>>;
}

export interface PlatformsServiceI {
    registerPlatform(createPlatform: CreatePlatformDto): Promise<Platforms>;
    getPlatforms(paginationQuery: PaginationQueryDto): Promise<PaginationResponseDto<Platforms>>
}