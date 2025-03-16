import { DataSource, Repository } from "typeorm";
import nodemailer from 'nodemailer';
import { sign, verify } from 'jsonwebtoken';
import { User } from "../../domain/entities/user.entity";
import { UpdateUser } from "../../domain/dtos/user.dtos";
import { JobHistory } from "../../domain/entities/jobHistory.entity";
import { config } from "../../../shared/config/config";
import { City } from "../../domain/entities/city.entity";
import { Province } from "../../domain/entities/province.entity";



export class UserService {

    private _usersRepository: Repository<User>;
    private _cityRepository: Repository<City>;
    private _jobHistory: Repository<JobHistory>;
    private _provinceRepository: Repository<Province>;


    constructor(client: DataSource) {
        this._usersRepository = client.getRepository(User);
        this._jobHistory = client.getRepository(JobHistory);
        this._cityRepository = client.getRepository(City);
        this._provinceRepository = client.getRepository(Province);
    }

    async sendVerificationEmail(user: User) {
        const token = sign({ uid: user.uid }, config.KEY_JWT, { expiresIn: '1h' });
        const verificationLink = `${config.FRONTEND_URL}/verify-email?token=${token}`;
        const verificationLinkLocal = `${config.FRONTEND_URL_LOCAL}/verify-email?token=${token}`;


        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: config.EMAIL,
                pass: config.PASSWORD_EMAIL,
            },
        });


        const mailOptions = {
            from: '"Tu App" <no-reply@tuapp.com>',
            to: user.email,
            subject: 'Verifica tu correo electrónico',
            text: `Hola ${user.firstName},
        
        Para confirmar tu cuenta, por favor haz clic en el siguiente enlace:
        ${verificationLink}
        ${verificationLinkLocal}
        
        Si no solicitaste esta cuenta, ignora este mensaje.`,
            html: `<p>Hola ${user.firstName},</p>
                   <p>Para confirmar tu cuenta, por favor haz clic en el siguiente enlace:</p>
                   <p><a href="${verificationLink}">${verificationLink}</a></p>
                   <p><a href="${verificationLinkLocal}">${verificationLinkLocal}</a></p>
                   <p>Si no solicitaste esta cuenta, ignora este mensaje.</p>`
        };

        await transporter.sendMail(mailOptions);
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

        if (!user.emailConfirmed) {
            throw new Error('Email not confirmed');
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

            await this.sendVerificationEmail(user);
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

    async verifyEmail(token: string) {
        try {
            const decoded = verify(token, config.KEY_JWT) as any;
            const userId = decoded.uid;

            const user = await this._usersRepository.findOne({
                where: {
                    uid: userId,
                }
            });

            if (!user) {
                throw new Error('User not found');
            }

            user.emailConfirmed = true;
            await this._usersRepository.save(user);

        } catch (error) {
            console.error("Error en verifyEmail:", error);
            throw new Error("Ocurrió un error al verificar el correo electrónico. Por favor, inténtelo de nuevo más tarde.");
        }
    }



    async getContextUser(userUID: string) {

        const user = await this._usersRepository.findOne({
            where: {
                uid: userUID,
            },
            relations: ['identificationType', 'educations', 'jobHistory', 'languages', 'joblikes.job', 'city']
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
            },
            relations: {
                city: true,
                province: true,
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

        const city = await this._cityRepository.findOneBy({
            uid: updateUser.cityUID,
        })

        const province = await this._provinceRepository.findOneBy({
            uid: updateUser.provinceUID,
        })

        user.firstName = updateUser.firstName;
        user.lastName = updateUser.lastName;
        user.identification = updateUser.identification;
        user.whatsapp = updateUser.whatsapp;
        user.gender = updateUser.gender;
        user.city = city;
        user.province = province;
        user.preferredWorkType = updateUser.preferredWorkType;
        user.expectedSalaryMin = updateUser.expectedSalaryMin;
        user.expectedSalaryMax = updateUser.expectedSalaryMax;

        await this._usersRepository.save(user);
        return user;
    }

}