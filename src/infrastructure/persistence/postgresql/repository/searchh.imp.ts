import { DataSource, Repository } from "typeorm";
import { SearchRepositoryI } from "../../../../domain/ports/search.port";
import { Search } from "../../../../domain/entities/search.entity";


export class SearchRepository implements SearchRepositoryI {


    _searchRepository: Repository<Search>;

    constructor(private _client: DataSource) {

        this._searchRepository = this._client.getRepository(Search);
    }

    async sought(uid: string): Promise<void> {
        await this._searchRepository.update({ uid }, { sought: true });

        return Promise.resolve();
    }


    async lastSearch(limit: number): Promise<Search[]> {
        const result = await this._searchRepository.find({ order: { createdAt: 'DESC' }, take: limit, where: { sought: false } });
        return result;
    }
}