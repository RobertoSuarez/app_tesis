import { DataSource, Repository } from "typeorm";
import { PaginationQueryDto, PaginationResponseDto } from "../../../../domain/dtos/paginator.dtos";
import { CreatePlatformDto } from "../../../../domain/dtos/platforms.dtos";
import { PlatformsRepositoryI } from "../../../../domain/ports/platforms.port";
import { Platforms } from "../../../../domain/entities/platforms.entity";


export class PlatformsRepository implements PlatformsRepositoryI {

    repository: Repository<Platforms>;
    constructor(private _client: DataSource) {
        this.repository = this._client.getRepository(Platforms);
    }

    async createPlatform(createPlatform: CreatePlatformDto): Promise<Platforms> {
        try {
            const platform = new Platforms();
            platform.name = createPlatform.name;
            platform.url = createPlatform.url;
            return await this.repository.save(platform);
        } catch (err) {
            if (err.code === '23505') {
                throw new Error('Platform already exists');
            }
            throw new Error(err);
        }
    }
    getPlatforms(paginationQuery: PaginationQueryDto): Promise<PaginationResponseDto<Platforms>> {
        throw new Error("Method not implemented.");
    }

}