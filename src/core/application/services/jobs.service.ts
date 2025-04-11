import { Jobs } from "../../domain/entities/jobs.entity";
import { DataSource, Like, MoreThan, Repository } from "typeorm";
import { User } from "../../domain/entities/user.entity";
import { Search } from "../../domain/entities/search.entity";
import { UserService } from "./user.service";
import { CompuTrabajoScraping } from "../../../infrastructure/scraping/puppeteer/compuTrabajoScraping.imp";
import { MultitrabajosScraping } from "../../../infrastructure/scraping/puppeteer/multitrabajosScraping.imp";
import { config } from "../../../shared/config/config";
import { JobLikes } from "../../domain/entities/jobLikes.entity";
import { JobLikesService } from "./JobLikes.service";
import { ScrapingStats } from "../../domain/entities/scraping-stats.entity";

export interface Weights {
  // Pesos globales para cada grupo (la suma debe ser 1 o 100%, según convenga)
  overall: {
    economic: number;      // Peso global para criterios económicos
    professional: number;  // Peso global para criterios profesionales
  };
  // Subcriterios dentro del grupo económico
  economic: {
    salary: number;        // A1
    location: number;      // A2
    workType: number;      // A3
  };
  // Subcriterios dentro del grupo profesional
  professional: {
    relevance: number;     // B1
    company: number;       // B2
    opportunities: number; // B3
  };
}


export class JobsService {

  private _jobsRepository: Repository<Jobs>;
  private _searchRepository: Repository<Search>;
  private _jobLikesRepository: Repository<JobLikes>;
  private _scrapingStatsRepository: Repository<ScrapingStats>;

  constructor(
    private _clienteSQL: DataSource,
    private _userService: UserService,
    private _compuTrabajoScraping: CompuTrabajoScraping,
    private _multitrabajosScraping: MultitrabajosScraping,
    private _jobLikesService: JobLikesService,
  ) {
    this._jobsRepository = this._clienteSQL.getRepository(Jobs);
    this._searchRepository = this._clienteSQL.getRepository(Search);
    this._jobLikesRepository = this._clienteSQL.getRepository(JobLikes);
    this._scrapingStatsRepository = this._clienteSQL.getRepository(ScrapingStats);
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

  async getJobByID(uid: string) {
    const job = await this._jobsRepository.findOne({
      where: {
        uid: uid,
      },
      relations: ['platform']
    });

    return job;
  }

  /**
   * Obtiene las estadísticas de scraping
   * @param platform Plataforma opcional para filtrar (computrabajo, multitrabajos o total)
   * @param limit Límite de registros a devolver (por defecto 10)
   * @returns Lista de estadísticas de scraping ordenadas por fecha de creación descendente
   */
  async getScrapingStats(platform?: string, limit: number = 10) {
    const whereCondition = platform ? { platform } : {};
    
    const stats = await this._scrapingStatsRepository.find({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take: limit
    });

    return stats;
  }

  async webScrapingJobs(amountScraping: number): Promise<void> {
    const lastSearch = await this._searchRepository.find({
      order: { createdAt: 'DESC' },
      take: amountScraping,
      where: { sought: false }
    });

    if (!lastSearch || lastSearch.length === 0) {
      return;
    }

    for (let index = 0; index < lastSearch.length; index++) {
      const currentSearch = lastSearch[index];

      if (!currentSearch.query || currentSearch.query.trim() === '') {
        await this._searchRepository.update({ uid: currentSearch.uid }, { sought: true });
        console.warn(`Se omitió una búsqueda vacía con UID: ${currentSearch.uid}`);
        continue;
      }

      try {
        // Contadores para estadísticas de scraping
        const scrapingStats = {
          computrabajo: { totalUrls: 0, successful: 0, failed: 0 },
          multitrabajos: { totalUrls: 0, successful: 0, failed: 0 },
          total: { totalUrls: 0, successful: 0, failed: 0 }
        };

        // Obtener URLs de MultiTrabajos
        const multitrabajosUrls = await this._multitrabajosScraping.searchJobs(currentSearch.query);
        scrapingStats.multitrabajos.totalUrls = multitrabajosUrls.length;
        scrapingStats.total.totalUrls += multitrabajosUrls.length;

        // Obtener URLs de CompuTrabajo
        const compuTrabajoUrls = await this._compuTrabajoScraping.getURLs(currentSearch.query);
        scrapingStats.computrabajo.totalUrls = compuTrabajoUrls.length;
        scrapingStats.total.totalUrls += compuTrabajoUrls.length;

        // Combinar todas las URLs
        const urls = [...compuTrabajoUrls, ...multitrabajosUrls];

        await this._searchRepository.update({ uid: currentSearch.uid }, { sought: true });

        for (let indexUrl = 0; indexUrl < urls.length; indexUrl++) {
          try {
            const url = urls[indexUrl];
            const exists = await this._jobsRepository.findOne({ where: { URL: url } });
            if (exists) continue;

            let job: Jobs = null;
            const platform = this.getPlatform(url);
            switch (platform) {
              case 'multitrabajos':
                job = await this._multitrabajosScraping.getJob(url);
                if (job && job.title) {
                  scrapingStats.multitrabajos.successful++;
                  scrapingStats.total.successful++;
                } else {
                  scrapingStats.multitrabajos.failed++;
                  scrapingStats.total.failed++;
                }
                break;
              case 'computrabajo':
                job = await this._compuTrabajoScraping.getJob(url);
                if (job && job.title) {
                  scrapingStats.computrabajo.successful++;
                  scrapingStats.total.successful++;
                } else {
                  scrapingStats.computrabajo.failed++;
                  scrapingStats.total.failed++;
                }
                break;
              default:
                continue;
            }
            if (!job || !job.title) continue;
            await this._jobsRepository.save(job);
          } catch (err) {
            console.error(`Error procesando URL: ${err.message}`);
            // Incrementar contador de fallos según la plataforma
            const platform = this.getPlatform(urls[indexUrl]);
            if (platform === 'multitrabajos') {
              scrapingStats.multitrabajos.failed++;
            } else if (platform === 'computrabajo') {
              scrapingStats.computrabajo.failed++;
            }
            scrapingStats.total.failed++;
          }
        }

        // Guardar estadísticas de scraping para cada plataforma y el total
        await this.saveScrapingStats('computrabajo', currentSearch.query, scrapingStats.computrabajo);
        await this.saveScrapingStats('multitrabajos', currentSearch.query, scrapingStats.multitrabajos);
        await this.saveScrapingStats('total', currentSearch.query, scrapingStats.total);

      } catch (err) {
        console.error(`Error en el scraping de "${currentSearch.query}": ${err.message}`);
      }
    }
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

  /**
   * Implementación del modelo MCDA basado en AHP:
   * Se evalúan los registros (ofertas de empleo) en dos grandes criterios:
   * 
   * 1. Desarrollo económico (50% del score):
   *    - A1: Salario (40% de lo económico)
   *    - A2: Ubicación (30%)
   *    - A3: Tipo/Modalidad (30%)
   * 
   * 2. Desarrollo profesional (50% del score):
   *    - B1: Relevancia (40% de lo profesional)
   *    - B2: Empresa (30%)
   *    - B3: Oportunidades (30%)
   * 
   * La puntuación final se obtiene combinando ambas partes.
   */
  async getJobs(userId: string, search: string, weights: Weights) {
    const userContext = await this._userService.getContextUser(userId);

    // Se registra la búsqueda reciente
    const searched = await this._searchRepository.findOne({
      where: {
        query: search,
        createdAt: MoreThan(new Date(Date.now() - 24 * 60 * 60 * 1000)),
      },
    });
    if (!searched) {
      await this._searchRepository.save({
        query: search,
        user: userContext,
        sought: false,
      });
    }

    // Se obtienen las ofertas cuyo título contenga el término de búsqueda
    const jobs: Jobs[] = await this._jobsRepository.find({
      where: {
        title: Like(`%${search}%`),
      },
      take: 800,
      order: {
        hasSalaryRange: 'DESC',
        salaryMax: 'DESC',
      }
    });

    // Se evalúa cada oferta usando nuestro algoritmo MCDA
    let scoredJobs = jobs.map((job) => ({
      job,
      score: this.calculateMCDAScore(job, userContext, weights),
      like: this.isJobLikedByUser(job, userContext.joblikes),
    }));

    // Se ordenan las ofertas de mayor a menor score
    scoredJobs = scoredJobs.sort((a, b) => b.score - a.score).slice(0, 40);
    return scoredJobs;
  }

  isJobLikedByUser(job: Jobs, jobLikes: JobLikes[]): boolean {
    const result = jobLikes.some(like => like.job.uid === job.uid);
    return result;
  }

  /**
   * Calcula el score MCDA para una oferta de empleo.
   */
  private calculateMCDAScore(job: Jobs, user: User, weights: Weights): number {
    // Criterios de Desarrollo económico
    const salaryScore = this.calculateSalaryScore(
      job.hasSalaryRange,
      job.salaryMin,
      job.salaryMax,
      user.expectedSalaryMin,
      user.expectedSalaryMax
    ); // A1

    const locationScore = this.calculateLocationScore(job.Location, user.city?.name); // A2
    const workTypeScore = this.calculateWorkTypeScore(job.workType, user.preferredWorkType); // A3

    // Puntuación económica ponderada usando los pesos definidos en weights.economic
    const economicScore =
      weights.economic.salary * salaryScore +
      weights.economic.location * locationScore +
      weights.economic.workType * workTypeScore;

    // Criterios de Desarrollo profesional
    const relevanceScore = this.calculateTitleRelevance(job.title, user); // B1
    const companyScore = job.companyReputation ? job.companyReputation / 10 : 0.5; // B2
    const opportunitiesScore =
      (job.hasGrowthOpportunities || (job.growthOpportunitiesDescription && job.growthOpportunitiesDescription.trim() !== "")) ? 1 : 0; // B3

    // Puntuación profesional ponderada usando los pesos definidos en weights.professional
    const professionalScore =
      weights.professional.relevance * relevanceScore +
      weights.professional.company * companyScore +
      weights.professional.opportunities * opportunitiesScore;

    // Puntuación final: combinación ponderada usando los pesos globales de cada criterio
    const finalScore =
      weights.overall.economic * economicScore +
      weights.overall.professional * professionalScore;

    return finalScore;
  }



  /**
   * Calcula la relevancia del título del trabajo comparándolo con el historial del usuario.
   */
  private calculateTitleRelevance(title: string, user: User): number {
    const userSkills = user.jobHistory.map((job) => job.jobTitle).join(' ').toLowerCase();
    const titleKeywords = title.toLowerCase().split(' ');
    let relevance = 0;
    titleKeywords.forEach((word) => {
      if (userSkills.includes(word)) {
        relevance += 1;
      }
    });
    return Math.min(relevance / titleKeywords.length, 1);
  }

  /**
   * Calcula la similitud de la ubicación.
   */
  private calculateLocationScore(jobLocation: string, userCity: string): number {
    if (!jobLocation || !userCity) return 0.5;
    if (jobLocation.toLowerCase().includes(userCity.toLowerCase())) {
      return 1;
    } else if (jobLocation.toLowerCase() === 'remote') {
      return 0.8;
    } else {
      return 0.3;
    }
  }

  /**
   * Evalúa la compatibilidad del tipo de trabajo.
   */
  private calculateWorkTypeScore(jobWorkType: string, userPreferredWorkType: string): number {
    if (!jobWorkType || !userPreferredWorkType) return 0.5;
    return jobWorkType.toLowerCase().includes(userPreferredWorkType.toLowerCase()) ? 1 : 0.3;
  }

  /**
   * Calcula la puntuación salarial en función de la superposición entre los rangos de la oferta y del usuario.
   */
  private calculateSalaryScore(
    hasSalaryRange: boolean,
    salaryMin: number,
    salaryMax: number,
    userExpectedSalaryMin: number,
    userExpectedSalaryMax: number
  ): number {
    if (!hasSalaryRange) {
      return 0.5;
    }
    if (salaryMin > salaryMax) {
      [salaryMin, salaryMax] = [salaryMax, salaryMin];
    }
    if (userExpectedSalaryMin > userExpectedSalaryMax) {
      [userExpectedSalaryMin, userExpectedSalaryMax] = [userExpectedSalaryMax, userExpectedSalaryMin];
    }
    const overlapMin = Math.max(salaryMin, userExpectedSalaryMin);
    const overlapMax = Math.min(salaryMax, userExpectedSalaryMax);
    if (overlapMin > overlapMax) {
      return 0;
    }
    const overlap = overlapMax - overlapMin;
    const jobRange = salaryMax - salaryMin;
    const userRange = userExpectedSalaryMax - userExpectedSalaryMin;
    const normalizedOverlapJob = jobRange > 0 ? overlap / jobRange : 0;
    const normalizedOverlapUser = userRange > 0 ? overlap / userRange : 0;
    const score = (normalizedOverlapJob + normalizedOverlapUser) / 2;
    return Math.max(0, Math.min(score, 1));
  }

  /**
   * Guarda las estadísticas de scraping en la base de datos
   * @param platform Plataforma de la que se extrajeron las ofertas (computrabajo, multitrabajos o total)
   * @param searchQuery Consulta de búsqueda utilizada
   * @param stats Estadísticas de scraping (total de URLs, extracciones exitosas y fallidas)
   */
  private async saveScrapingStats(
    platform: string,
    searchQuery: string,
    stats: { totalUrls: number; successful: number; failed: number }
  ): Promise<void> {
    try {
      // Verificar si hay algún valor mayor que cero
      const hasNonZeroValues = stats.totalUrls > 0 || stats.successful > 0 || stats.failed > 0;
      
      // Solo guardar si hay al menos un valor mayor que cero
      if (!hasNonZeroValues) {
        console.log(`Omitiendo estadísticas para ${platform} ya que todos los valores son cero.`);
        return;
      }

      // Calcular la tasa de éxito (porcentaje de extracciones exitosas sobre el total de URLs)
      const successRate = stats.totalUrls > 0 ? (stats.successful / stats.totalUrls) * 100 : 0;

      // Crear una nueva instancia de ScrapingStats
      const scrapingStats = new ScrapingStats();
      scrapingStats.searchQuery = searchQuery;
      scrapingStats.platform = platform;
      scrapingStats.totalUrlsFound = stats.totalUrls;
      scrapingStats.successfulExtractions = stats.successful;
      scrapingStats.failedExtractions = stats.failed;
      scrapingStats.successRate = parseFloat(successRate.toFixed(2)); // Redondear a 2 decimales

      // Guardar en la base de datos
      await this._scrapingStatsRepository.save(scrapingStats);

      console.log(`Estadísticas de scraping guardadas para ${platform}:`);
      console.log(`- Consulta: ${searchQuery}`);
      console.log(`- URLs encontradas: ${stats.totalUrls}`);
      console.log(`- Extracciones exitosas: ${stats.successful}`);
      console.log(`- Extracciones fallidas: ${stats.failed}`);
      console.log(`- Tasa de éxito: ${successRate.toFixed(2)}%`);
    } catch (error) {
      console.error(`Error al guardar estadísticas de scraping: ${error.message}`);
    }
  }
}
