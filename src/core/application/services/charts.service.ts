
import { DataSource, Repository } from "typeorm";
import { Platforms } from "../../domain/entities/platforms.entity";
import { User } from "../../domain/entities/user.entity";
import { JobLikes } from "../../domain/entities/jobLikes.entity";
import { JobHistory } from "../../domain/entities/jobHistory.entity";
import { Education } from "../../domain/entities/eductaion.entity";
import { Languages } from "../../domain/entities/languages.entity";
import { City } from "../../domain/entities/city.entity";
import { Province } from "../../domain/entities/province.entity";
import { Jobs } from "../../domain/entities/jobs.entity";


export class ChartsService {

    private _jobsRepository: Repository<Jobs>;
    private _platformsRepository: Repository<Platforms>;

    private _userRepository: Repository<User>;
    private _jobLikesRepository: Repository<JobLikes>;
    private _jobHistoryRepository: Repository<JobHistory>;
    private _educationRepository: Repository<Education>;
    private _languagesRepository: Repository<Languages>;
    private _cityRepository: Repository<City>;
    private _provinceRepository: Repository<Province>;

    constructor(private _client: DataSource) {
        this._jobsRepository = _client.getRepository(Jobs);
    }


    async getKPI() {

        // Cantidad de trabajos scrapeados.
        const countJobs = await this._jobsRepository.count();

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);

        const countJobsLastWeek = await this._jobsRepository
            .createQueryBuilder('jobs')
            .select('CAST(COUNT(jobs.uid) AS INT)', 'lastWeekCount')
            .where('jobs.created_at >= :lastWeek', { lastWeek: lastWeek.toISOString() })
            .getRawOne();

        const countJobsWithSalaryRange = await this._jobsRepository
            .createQueryBuilder('jobs')
            .select('CAST(COUNT(jobs.uid) AS INT)', 'jobsWithSalaryRange') // Convertir a entero
            .where('jobs.hasSalaryRange = :hasSalaryRange', { hasSalaryRange: true })
            .getRawOne();

        const top5Areas = await this._jobsRepository
            .createQueryBuilder('jobs')
            .select('jobs.area', 'area') // Selecciona el campo area
            .addSelect('COUNT(jobs.uid)', 'count') // Cuenta la cantidad de ofertas por área
            .where('jobs.area != :empty', { empty: "" }) // Filtra las áreas vacías
            .groupBy('jobs.area') // Agrupa los resultados por área
            .orderBy('count', 'DESC') // Ordena de mayor a menor según la cantidad de ofertas
            .limit(5) // Limita los resultados a 5
            .getRawMany();

        const jobCountByWeek = await this._jobsRepository
            .createQueryBuilder('jobs')
            .select('TO_CHAR(DATE_TRUNC(\'week\', jobs.created_at), \'YYYY-MM-DD"T"00:00:00.000Z\')', 'week') // Agrupa por semana, formato ISO
            .addSelect('COUNT(jobs.uid)', 'jobCount') // Cuenta la cantidad de trabajos
            .groupBy('TO_CHAR(DATE_TRUNC(\'week\', jobs.created_at), \'YYYY-MM-DD"T"00:00:00.000Z\')') // Agrupa por semana
            .orderBy('week', 'ASC') // Ordena por semana
            .getRawMany();

        // Asegurarse de que el campo 'week' tenga el formato ISO
        const jobCountByMonthResult = jobCountByWeek.map(item => ({
            week: item.week, // La fecha ya está en formato ISO
            jobCount: parseInt(item.jobCount, 10) // Convertir la cantidad de trabajos a entero
        }));


        const jobCountByPlatform = await this._jobsRepository
            .createQueryBuilder('jobs')
            .leftJoinAndSelect('jobs.platform', 'platform')
            .select('platform.name', 'platform')
            .addSelect('COUNT(jobs.uid)', 'count')
            .groupBy('platform.name')
            .orderBy('count', 'DESC')
            .getRawMany();

        const top5Localities = await this._jobsRepository
            .createQueryBuilder('jobs')
            .select('jobs.Location', 'location') // Selecciona la columna Location
            .addSelect('COUNT(*)', 'count') // Cuenta la cantidad de ofertas por localidad
            .groupBy('jobs.Location') // Agrupa por la columna Location
            .orderBy('count', 'DESC') // Ordena por el número de ofertas en orden descendente
            .limit(5) // Limita los resultados a las 5 localidades principales
            .getRawMany();


        const top5LocalitiesResult = top5Localities.map(item => ({
            location: item.location,
            count: parseInt(item.count, 10)
        }));

        // Formatear los resultados para que coincidan con la estructura deseada
        const jobCountByPlatformResult = jobCountByPlatform.map(item => ({
            platform: item.platform,
            count: parseInt(item.count, 10)
        }));



        return {
            totalJobs: countJobs,
            lastWeekCount: countJobsLastWeek.lastWeekCount,
            jobsWithSalaryRange: countJobsWithSalaryRange.jobsWithSalaryRange,
            top5Areas,
            jobCountByMonthResult,
            jobCountByPlatformResult,
            top5LocalitiesResult,
        };

    }

}