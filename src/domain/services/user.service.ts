import { DataSource, Repository } from "typeorm";
import { User } from "../models/user.entity";
import { sign } from 'jsonwebtoken';
import { config } from "../../shared/config/config";



export class UserService {

    private _usersRepository: Repository<User>;

    constructor(client: DataSource) {
        this._usersRepository = client.getRepository(User);
    }

    async login(email: string, password: string) {
        const user = await this._usersRepository.findOne({
            where: {
                email: email,
                password: password
            },
            relations: ['identificationType']
        });

        if (!user) {
            throw new Error('User not found');
        }

        user.password = undefined;

        var token = sign({user}, config.KEY_JWT, { expiresIn: '1h' });

        return { token, user };
    }

    async getContextUser(userUID: string) {

        const user = await this._usersRepository.findOne({
            where: {
                uid: userUID,
            },
            relations: ['identificationType', 'educations', 'jobHistory', 'languages', 'joblikes']
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

}