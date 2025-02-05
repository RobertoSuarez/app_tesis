import { CompuTrabajoScrapingI, JobsRepositoryI, LinkedinScrapingI, MultitrabajosScrapingI } from "../ports/jobs.port";
import { SearchRepositoryI } from "../ports/search.port";
import { Jobs } from "../models/jobs.entity";
import { config } from "../../shared/config/config";
import { DataSource, Like, MoreThan, Repository } from "typeorm";
import { JobsRepository } from "../../infrastructure/persistence/postgresql/repository/jobs.imp";
import { UserService } from "./user.service";
import { User } from "../models/user.entity";
import { CompuTrabajoScraping } from "../../infrastructure/scraping/puppeteer/compuTrabajoScraping.imp";
import { MultitrabajosScraping } from "../../infrastructure/scraping/puppeteer/multitrabajosScraping.imp";
import { Search } from "../models/search.entity";

export interface Weights {
    relavance: number;
    location: number;
    workType: number;
    salary: number;
};

export class JobsService {

    private jobsRepositoryORM: Repository<Jobs>;
    private searchRepositoryORM: Repository<Search>;

    constructor(
        private _jobsRepository: JobsRepository, 
        private _searchRepository: SearchRepositoryI,
        private _linkedinScraping: LinkedinScrapingI, 
        private _compuTrabajoScraping: CompuTrabajoScraping,
        private _multitrabajosScraping: MultitrabajosScraping,
        private _userService: UserService,
        private _clienteSQL: DataSource,
    ) 
    {
        this.jobsRepositoryORM = this._jobsRepository.repositoryJobs;
        this.searchRepositoryORM = this._clienteSQL.getRepository(Search);
    }


    async test(query: string): Promise<void> {
        const job = await this._multitrabajosScraping.getJob(query);
    }

    async getUrl(query: string): Promise<string[]> {
        const urls = await this._compuTrabajoScraping.getURLs(query);
        return urls;
    }

    async getUrlComputrabajo(query: string): Promise<string[]> {
        const urls = await this._compuTrabajoScraping.getURLs(query);
        return urls;
    }

 

    async webScrapingJobs(amountScraping: number): Promise<void> {

        const lastSearch = await this._searchRepository.lastSearch(amountScraping);
        if (!lastSearch || lastSearch.length === 0) {
            return;
        }

        const keyGoogle = config.GCP_KEY;
        const searchEngineId = config.SEARCH_ENGINE_ID;

        for (let index = 0; index < lastSearch.length; index++) {
            // TODO: Extraer 10 urls de la búsqueda
            const currentSearch = lastSearch[index];

            const multitrabajosUrls = await this._multitrabajosScraping.searchJobs(currentSearch.query);
            const urls = await this._compuTrabajoScraping.getURLs(currentSearch.query);

            urls.push(...multitrabajosUrls);

            try {
                // const params = {
                //     key: keyGoogle,
                //     cx: searchEngineId,
                //     q: encodeURIComponent(currentSearch.query),
                //     num: 10,
                // }
                // const url = `https://www.googleapis.com/customsearch/v1`;

                // Aplicamos que ya se ha buscado el termino
                await this._searchRepository.sought(currentSearch.uid);


                // const response = await axios.get(url, { params });
                
                // const items = response.data.items;
                // if (!items) {
                //     continue;
                // }
                // let urls = items.map((item: any) => item.link)
                // console.log(urls);

                // TODO: Quitar eso, se coloca esto solo por testeo
                // urls = [];

                

                for (let indexUrl = 0; indexUrl < urls.length; indexUrl++) {

                    try {
                        const url = urls[indexUrl];
                        const ok = await this._jobsRepository.scraped(url);
                        if (ok) {
                            continue;
                        }

                        let job: Jobs = null;
                        const platform = this.getPlatform(url);
                        switch (platform) {
                            case 'multitrabajos':
                                job = await this._multitrabajosScraping.getJob(url);
                                break;
                            case 'computrabajo':
                                job = await this._compuTrabajoScraping.getJob(url);
                                break;
                            default:
                                continue;
                        }

                        if (!job.title) {
                            continue;
                        }
                        
                        await this._jobsRepository.registerJob(job);
                    } catch (err) {
                        console.log(err);
                    } finally {
                        continue;
                    }
                    
                }


                
                
            } catch (err) {
                console.log(err);
                throw err;
            }
        }
        return;
    }

    getPlatform(urlStr: string) {
        if (urlStr.includes('linkedin')) {
            return 'linkedin';
        }

        if (urlStr.includes('computrabajo')) {
            return 'computrabajo';
        }

        if (urlStr.includes('multitrabajos')) {
            return 'multitrabajos';
        }

        return null;
    }

    async getJobs(userId: string, search: string) {

        const userContext = await this._userService.getContextUser(userId);

        const searched = await this.searchRepositoryORM.findOne({
            where: {
                query: search,
                createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
            },
        });

        if (!searched) {
          await this.searchRepositoryORM.save({
            query: search,
            user: userContext,
            sought: false,
          });
        }


        const jobs: Jobs[] = await this.jobsRepositoryORM.find({
            where: {
                title: Like(`%${search}%`),
            }, 
            take: 20,
        });

        const weights: Weights = {
            relavance: 0.4,
            location: 0.3,
            workType: 0.2,
            salary: 0.1,
        };

        // Evaluar y puntuar cada oferta de trabajo
        const scoredJobs = jobs.map((job) => ({
            job,
            score: this.calculateScore(job, userContext, weights),
        }))

        // Ordenar las ofertas de trabajo por puntaje descendente
        scoredJobs.sort((a, b) => b.score - a.score);

        return scoredJobs;
        

    }


    private calculateScore(job: Jobs, user: User, weights: Weights): number {

        let score = 0;
        const titleRelevance = this.calculateTitleRelevance(job.title, user);
        score += titleRelevance * weights.relavance;

        // Ubicacion
        const locationScore = this.calculateLocationScore(job.Location, user.city?.name);
        score += locationScore * weights.location;

        // tipo de trabajo.
        const workTypeScore = this.calculateWorkTypeScore(job.workScheduleType, user.preferredWorkType);
        score += workTypeScore * weights.workType;

        // Salario
        const salaryScore = this.calculateSalaryScore(job.hasSalaryRange, job.salaryMin, job.salaryMax, user.expectedSalaryMin, user.expectedSalaryMax);
        score += salaryScore * weights.salary;

        return score;
    }

    /**
   * Calcula la relevancia del título del trabajo respecto al usuario.
   */
  private calculateTitleRelevance(title: string, user: User): number {
    // Implementa una lógica para evaluar la relevancia.
    // Por ejemplo, comparar palabras clave en el título con las habilidades del usuario.
    // Aquí se usa una puntuación simplificada.
    const userSkills = user.jobHistory.map((job) => job.jobTitle).join(' ').toLowerCase();
    const titleKeywords = title.toLowerCase().split(' ');

    let relevance = 0;
    titleKeywords.forEach((word) => {
      if (userSkills.includes(word)) {
        relevance += 1;
      }
    });

    // Normalizar la relevancia (por ejemplo, entre 0 y 1)
    return Math.min(relevance / titleKeywords.length, 1);
  }

  /**
   * Calcula la puntuación de ubicación.
   */
  private calculateLocationScore(jobLocation: string, userCity: string): number {
    if (!jobLocation || !userCity) return 0.5; // Puntuación media si falta información


    if (jobLocation.toLowerCase().includes(userCity.toLowerCase())) {
      return 1;
    } else if (jobLocation.toLowerCase() === 'remote') {
      return 0.8;
    } else {
      return 0.3; // Distante
    }
  }

  /**
   * Calcula la puntuación del tipo de trabajo.
   */
  private   calculateWorkTypeScore(jobWorkType: string, userPreferredWorkType: string): number {
    if (!jobWorkType || !userPreferredWorkType) return 0.5;

    if (jobWorkType.toLowerCase().includes(userPreferredWorkType.toLowerCase())) {
      return 1;
    } else {
      return 0.3;
    }
  }

  /**
   * Calcula la puntuación del salario.
   */
  private calculateSalaryScore(hasSalaryRange: boolean, salaryMin: number, salaryMax: number, userExpectedSalaryMin: number, userExpectedSalaryMax: number): number {
    // Si la oferta no tiene rango salarial definido, asignamos una puntuación neutral
    if (!hasSalaryRange) {
      return 0.5;
    }
  
    // Validar que los salarios mínimos no sean mayores que los máximos
    if (salaryMin > salaryMax) {
      [salaryMin, salaryMax] = [salaryMax, salaryMin];
    }
  
    if (userExpectedSalaryMin > userExpectedSalaryMax) {
      [userExpectedSalaryMin, userExpectedSalaryMax] = [userExpectedSalaryMax, userExpectedSalaryMin];
    }
  
    // Calcular la superposición entre los rangos salariales
    const overlapMin = Math.max(salaryMin, userExpectedSalaryMin);
    const overlapMax = Math.min(salaryMax, userExpectedSalaryMax);
  
    // Si no hay superposición, la puntuación es baja
    if (overlapMin > overlapMax) {
      return 0;
    }
  
    // Calcular la cantidad de superposición
    const overlap = overlapMax - overlapMin;
  
    // Calcular el rango salarial de la oferta y del usuario
    const jobRange = salaryMax - salaryMin;
    const userRange = userExpectedSalaryMax - userExpectedSalaryMin;
  
    // Evitar división por cero
    const normalizedOverlapJob = jobRange > 0 ? overlap / jobRange : 0;
    const normalizedOverlapUser = userRange > 0 ? overlap / userRange : 0;
  
    // Promediar las dos normalizaciones para una puntuación equilibrada
    const score = (normalizedOverlapJob + normalizedOverlapUser) / 2;
  
    // Asegurarse de que la puntuación esté entre 0 y 1
    return Math.max(0, Math.min(score, 1));
  }
}