import { DataSource, IsNull, Repository } from "typeorm";
import { JobLikes } from "../../domain/entities/jobLikes.entity";
import { registerJobLike } from "../../domain/dtos/jobLikes.dtos";
import { Jobs } from "../../domain/entities/jobs.entity";
import { User } from "../../domain/entities/user.entity";


export class JobLikesService {

    private _jobLikesRepository: Repository<JobLikes>;
    private _userRepository: Repository<User>;
    private _jobs: Repository<Jobs>;

    constructor(
        private _clientSQL: DataSource
    ) {

        this._jobLikesRepository = this._clientSQL.getRepository(JobLikes);
        this._userRepository = this._clientSQL.getRepository(User);
        this._jobs = this._clientSQL.getRepository(Jobs);
    }

    async registerJobLike(data: registerJobLike) {

        const user = await this._userRepository.findOne({
            where: {
                uid: data.userUID,
            }
        })
        const job = await this._jobs.findOne({
            where: {
                uid: data.jobUID,
            }
        });

        const jobLikeEntity = this._jobLikesRepository.create({
            job,
            user,
        })

        return this._jobLikesRepository.save(jobLikeEntity);

    }

    // Recupera todos los likes que ha dado el usuario.
    async getJobLikeByUser(userUID: string) {
        const jobLikes = await this._jobLikesRepository.find({
            relations: ['job'],
            where: {
                user: {
                    uid: userUID,
                },
                deletedAt: IsNull(),
            }
        });

        return jobLikes;
    }


    // Eliminamos el joblike.
    async deleteLike(jobLikeUID: string) {
        const jobLike = await this._jobLikesRepository.findOneBy({
            uid: jobLikeUID,
        });

        if (!jobLike) {
            return false;
        }

        await this._jobLikesRepository.softDelete(jobLike.uid);

        return true;
    }
}