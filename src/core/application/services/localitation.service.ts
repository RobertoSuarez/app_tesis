import { DataSource, Repository } from "typeorm";
import { City } from "../../domain/entities/city.entity";
import { Province } from "../../domain/entities/province.entity";


export class LocationsService {

    private _cityRepository: Repository<City>;
    private _provinceRepository: Repository<Province>;

    constructor(
        private _client: DataSource,
    ) {

        this._cityRepository = this._client.getRepository(City);
        this._provinceRepository = this._client.getRepository(Province);
    }

    async getProvince() {
        return await this._provinceRepository.find();
    }

    async getCities(provinceUID: string) {

        return await this._cityRepository.find({
            where: {
                province: {
                    uid: provinceUID
                }
            }
        })
    }


}