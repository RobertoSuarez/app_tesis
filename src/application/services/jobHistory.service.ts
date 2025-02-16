import { DataSource, Repository } from "typeorm";
import { JobHistory } from "../../domain/entities/jobHistory.entity";
import { registerJobHistory } from "../../domain/dtos/jobHistory.dtos";



export class JobHistoryService {

    private _jobHistory: Repository<JobHistory>;

    constructor(
        client: DataSource
    ) {

        this._jobHistory = client.getRepository(JobHistory);
    }

    async getWorkHistory(uid: string) {
        const jobs = await this._jobHistory.find({
            where: {
                user: {
                    uid: uid,
                }
            }
        });

        return jobs;
    }

    async registerWork({ jobTitle, company, end, start, userUID }: registerJobHistory) {
        // Primero, buscamos el usuario en la base de datos.
        const userRepository = this._jobHistory.manager.getRepository('User');
        const user = await userRepository.findOne({ where: { uid: userUID } });
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // Creamos y guardamos el historial laboral asignándolo al usuario encontrado.
        const jobHistory = this._jobHistory.create({
            jobTitle,
            company,
            end,
            start,
            user,
        });

        const result = await this._jobHistory.save(jobHistory);
        delete result.user;
        return result;
    }

}