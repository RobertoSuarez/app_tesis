import { DataSource, Repository } from "typeorm";
import { Education } from "../../domain/entities/eductaion.entity";
import { createEducation } from "../../domain/dtos/education.dtos";
import { User } from "../../domain/entities/user.entity";



export class EducationService {


    private _educationRepository: Repository<Education>;
    private _userRepository: Repository<User>;

    constructor(client: DataSource) {

        this._educationRepository = client.getRepository(Education);
        this._userRepository = client.getRepository(User);
    }

    async getEducation(uid: string) {
        return await this._educationRepository.find({
            where: {
                user: {
                    uid: uid,
                }
            }
        });
    }

    async registerEducation(education: createEducation) {
        const user = await this._userRepository.findOne({
            where: {
                uid: education.uid,
            }
        });

        const newEducation = this._educationRepository.create({
            institucion: education.institucion,
            titulo: education.titulo,
            description: education.description,
            start: education.start,
            end: education.end,
            user: user,
        });

        const result = await this._educationRepository.save(newEducation);
        return result.uid;
    }
}