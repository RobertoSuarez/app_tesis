import { DataSource, Repository } from "typeorm";
import { Languages } from "../../domain/entities/languages.entity";
import { registerLanguage } from "../../domain/dtos/language.dtos";
import { User } from "../../domain/entities/user.entity";

export class LanguageService {


    private _languageRepository: Repository<Languages>;
    private _userRepository: Repository<User>;

    constructor(client: DataSource) {
        this._languageRepository = client.getRepository(Languages);
        this._userRepository = client.getRepository(User);
    }

    async registerLanguage(language: registerLanguage) {
        const user = await this._userRepository.findOne({
            where: {
                uid: language.userId,
            }
        });
        const newLanguage = this._languageRepository.create({
            title: language.title,
            description: language.description,
            level: language.level,
            user: user,
        });

        return this._languageRepository.save(newLanguage);
    }

    async getLanguagesByUser(userUId: string) {

        return await this._languageRepository.find({
            where: {
                user: {
                    uid: userUId
                }
            }
        });

    }

}