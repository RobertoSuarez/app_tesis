import { DataSource, Repository } from "typeorm";
import { User } from "../../domain/entities/user.entity";
import { sign } from 'jsonwebtoken';
import { config } from "../../shared/config/config";
import { UpdateUser } from "../../domain/dtos/user.dtos";
import { JobHistory } from "../../domain/entities/jobHistory.entity";



export class UserService {

    private _usersRepository: Repository<User>;
    private _jobHistory: Repository<JobHistory>;

    constructor(client: DataSource) {
        this._usersRepository = client.getRepository(User);
        this._jobHistory = client.getRepository(JobHistory);
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

        var token = sign({ user }, config.KEY_JWT, { expiresIn: '1h' });

        return { token, user };
    }

    // Se inicia sesion con el uid del usuario.
    async loginWithID(userId: string) {
        const user = await this._usersRepository.findOne({
            where: {
                uid: userId,
            },
            relations: ['identificationType']
        });

        if (!user) {
            throw new Error('User not found');
        }

        user.password = undefined;

        var token = sign({ user }, config.KEY_JWT, { expiresIn: '1h' });

        return { token, user };
    }

    async registerUser(firstName: string, email: string, password: string) {
        try {
            const user = await this._usersRepository.save({
                firstName,
                email,
                password,
                role: 'user-normal',
                emailConfirmed: false,
                disability: false,
            });
            return user.uid;
        } catch (error: any) {
            console.error("Error en registerUser:", error);

            // Manejo específico para error de duplicidad (por ejemplo, en PostgreSQL, el código '23505' indica una violación de clave única)
            if (error.code && error.code === '23505') {
                throw new Error("El correo electrónico ya se encuentra registrado.");
            }

            // Para cualquier otro error se lanza un error genérico
            throw new Error("Ocurrió un error al registrar el usuario. Por favor, inténtelo de nuevo más tarde.");
        }
    }



    async getContextUser(userUID: string) {

        const user = await this._usersRepository.findOne({
            where: {
                uid: userUID,
            },
            relations: ['identificationType', 'educations', 'jobHistory', 'languages', 'joblikes', 'city']
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }


    async getUserByIDSimplet(UID: string) {
        const user = await this._usersRepository.findOne({
            where: {
                uid: UID,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        return user;
    }

    async updateUser(updateUser: UpdateUser) {
        const user = await this._usersRepository.findOne({
            where: {
                uid: updateUser.uid,
            }
        });

        if (!user) {
            throw new Error('User not found');
        }

        Object.assign(user, updateUser);
        await this._usersRepository.save(user);
        return user;
    }

}