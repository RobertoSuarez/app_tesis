import { Jobs } from "../../domain/entities/jobs.entity";
import { DataSource, Like, MoreThan, MoreThanOrEqual, LessThanOrEqual, Repository, Raw, In, Any } from "typeorm";
import { User } from "../../domain/entities/user.entity";
import { Search } from "../../domain/entities/search.entity";
import { JobFilters, SortOptions, PaginationOptions } from "../../../infrastructure/api/controllers/job.controller";
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
  async getJobs(
    userId: string, 
    search: string, 
    weights: Weights,
    filters?: JobFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ) {
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

    console.log('Search term:', search);
    
    // Construir las condiciones de búsqueda avanzada
    let whereConditions: any;
    
    if (search && search.trim() !== '') {
      // Campos en los que buscar, con pesos de relevancia (1-10)
      const searchFields = [
        { field: 'title', weight: 10 },
        { field: 'description', weight: 8 },
        { field: 'Company', weight: 7 },
        { field: 'position', weight: 9 },
        { field: 'area', weight: 6 },
        { field: 'Location', weight: 5 },
        { field: 'workType', weight: 4 },
        { field: 'levelExperience', weight: 6 },
        { field: 'growthOpportunitiesDescription', weight: 3 },
        { field: 'alignmentWithProfession', weight: 5 }
      ];
      
      // Lista de términos técnicos que deben preservarse incluso si son cortos
      const technicalTerms = ['.net', 'c#', 'php', 'ios', 'aws', 'c++', 'sql', 'api', 'ui', 'ux', 'qa', 'js', 'net', 'asp', 'vue', 'go', 'r', 'ml', 'ai', 'iot'];
      
      // Caso especial para .NET que puede escribirse de varias formas
      const normalizedSearch = search.trim().toLowerCase();
      if (normalizedSearch === '.net' || normalizedSearch === 'dotnet' || normalizedSearch === 'dot net') {
        // Para .NET, buscar varias formas comunes de escribirlo
        console.log('Caso especial para .NET detectado');
        const dotNetTerms = ['.net', 'dotnet', 'dot net', 'asp.net', 'asp net', 'net core', '.net core', 'c#'];
        whereConditions = [];
        
        // Crear condiciones para cada variante de .NET en cada campo
        searchFields.forEach(({ field }) => {
          dotNetTerms.forEach(term => {
            const condition: any = {};
            condition[field] = Raw(alias => `LOWER(${alias}) LIKE LOWER('%${term.replace(/'/g, "''")}%')`);
            whereConditions.push(condition);
          });
        });
        
        console.log('Search terms for .NET:', dotNetTerms);
        // No hacemos return, continuamos con el flujo normal
      }
      
      // Tokenizar la búsqueda para mejorar los resultados
      const searchTerms = search.trim().split(/\s+/).filter(term => {
        // Mantener términos técnicos conocidos o términos con longitud > 2
        return technicalTerms.includes(term.toLowerCase()) || term.length > 2;
      });
      console.log('Search terms:', searchTerms);
      
      // Si no hay términos válidos después de filtrar, usar el término original completo
      const termsToUse = searchTerms.length > 0 ? searchTerms : [search.trim()];
      
      // Crear condiciones para cada término de búsqueda en cada campo
      whereConditions = [];
      
      // Crear condiciones para cada campo y término
      termsToUse.forEach(term => {
        searchFields.forEach(({ field }) => {
          const condition: any = {};
          condition[field] = Raw(alias => `LOWER(${alias}) LIKE LOWER('%${term.replace(/'/g, "''")}%')`);
          whereConditions.push(condition);
        });
      });
    } else {
      // Si no hay término de búsqueda, usar un objeto vacío
      whereConditions = {};
    }

    // Crear un objeto para los filtros adicionales
    let filterConditions: any = {};
    
    // Aplicar filtros si están definidos
    if (filters) {
      console.log('Applying filters:', JSON.stringify(filters));
      this.applyFilters(filterConditions, filters);
    }
    
    // Combinar las condiciones de búsqueda con los filtros
    let finalWhereConditions: any;
    
    if (Array.isArray(whereConditions) && whereConditions.length > 0) {
      // Si tenemos condiciones de búsqueda en formato de array
      if (Object.keys(filterConditions).length > 0) {
        // Combinar búsqueda (OR) con filtros (AND)
        finalWhereConditions = [
          ...whereConditions.map(condition => ({ ...condition, ...filterConditions }))
        ];
      } else {
        // Solo usar las condiciones de búsqueda
        finalWhereConditions = whereConditions;
      }
    } else {
      // Si no hay condiciones de búsqueda o están vacías, usar solo los filtros
      finalWhereConditions = filterConditions;
    }
    
    console.log('Final where conditions:', JSON.stringify(finalWhereConditions));

    // Configurar opciones de paginación
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 40;
    const skip = (page - 1) * limit;

    // Configurar opciones de ordenamiento
    const orderOptions: any = {};
    if (sort) {
      if (sort.field === 'salary') {
        orderOptions.salaryMax = sort.direction;
      } else if (sort.field === 'datePosted') {
        orderOptions.scrapedAt = sort.direction;
      } else if (sort.field === 'companyReputation') {
        orderOptions.companyReputation = sort.direction;
      } else {
        // Default ordering if the sort field is not recognized
        orderOptions.hasSalaryRange = 'DESC';
        orderOptions.salaryMax = 'DESC';
      }
    } else {
      // Default ordering if no sort options are provided
      orderOptions.hasSalaryRange = 'DESC';
      orderOptions.salaryMax = 'DESC';
    }

    // Obtener el total de registros que coinciden con los criterios
    const totalCount = await this._jobsRepository.count({
      where: finalWhereConditions,
    });

    // Obtener los trabajos con paginación
    const jobs: Jobs[] = await this._jobsRepository.find({
      where: finalWhereConditions,
      skip: skip,
      take: limit,
      order: orderOptions,
      relations: ['platform']
    });

    // Se evalúa cada oferta usando nuestro algoritmo MCDA
    let scoredJobs = jobs.map((job) => ({
      job,
      score: this.calculateMCDAScore(job, userContext, weights),
      like: this.isJobLikedByUser(job, userContext.joblikes),
    }));

    // Ordenar por score si es la opción seleccionada
    if (sort && sort.field === 'score') {
      scoredJobs = scoredJobs.sort((a, b) => 
        sort.direction === 'ASC' ? a.score - b.score : b.score - a.score
      );
    }

    // Calcular el número total de páginas
    const totalPages = Math.ceil(totalCount / limit);

    return {
      jobs: scoredJobs,
      total: totalCount,
      page,
      totalPages
    };
  }

  /**
   * Aplica los filtros a las condiciones de búsqueda
   * @param whereConditions Condiciones de búsqueda a modificar
   * @param filters Filtros a aplicar
   */
  /**
   * Crea una condición SQL segura para búsquedas con LIKE usando el operador Raw
   * @param terms Array de términos para buscar
   * @returns Operador Raw con la condición SQL segura
   */
  private createSafeLikeCondition(terms: string[]): any {
    try {
      if (!terms || terms.length === 0) {
        return null;
      }
      
      // Escapar comillas simples para evitar inyección SQL
      const safeTerms = terms.map(term => term.replace(/'/g, "''"));
      
      return Raw(alias => 
        `LOWER(${alias}) LIKE '%${safeTerms[0]}%'` + 
        safeTerms.slice(1).map(term => ` OR LOWER(${alias}) LIKE '%${term}%'`).join('')
      );
    } catch (error) {
      console.error('Error creating SQL condition:', error);
      return null;
    }
  }

  private applyFilters(whereConditions: any, filters: JobFilters) {
    // Crear una copia de los filtros originales para debugging
    const originalFilters = { ...filters };
    
    try {
      // Filtros de salario - Estos son más flexibles ahora
      if (filters.salaryMin) {
        // Permitir un margen de 10% por debajo del salario mínimo solicitado
        const flexibleMin = Math.floor(filters.salaryMin * 0.9);
        whereConditions.salaryMin = MoreThanOrEqual(flexibleMin);
        console.log(`Adjusted salaryMin filter from ${filters.salaryMin} to ${flexibleMin}`);
      }
      
      if (filters.salaryMax) {
        // Permitir un margen de 10% por encima del salario máximo solicitado
        const flexibleMax = Math.ceil(filters.salaryMax * 1.1);
        whereConditions.salaryMax = LessThanOrEqual(flexibleMax);
        console.log(`Adjusted salaryMax filter from ${filters.salaryMax} to ${flexibleMax}`);
      }
      
      // El filtro hasSalaryRange es opcional ahora
      // Comentamos esta condición para obtener más resultados
      // if (filters.hasSalaryRange === true) {
      //   whereConditions.hasSalaryRange = filters.hasSalaryRange;
      // }
      console.log('Ignoring hasSalaryRange filter to get more results');
  
      // Filtros de ubicación - Búsqueda más flexible
      if (filters.location) {
        // Si la ubicación es un array, buscar cualquiera de las ubicaciones
        if (Array.isArray(filters.location)) {
          if (filters.location.length > 0) {
            // Usar la función segura para crear condiciones LIKE
            const locationTerms = filters.location.map(loc => loc.toLowerCase());
            const condition = this.createSafeLikeCondition(locationTerms);
            if (condition) {
              whereConditions.Location = condition;
            }
          }
        } else {
          whereConditions.Location = Like(`%${filters.location.toLowerCase()}%`);
        }
      }
  
      // Filtros de tipo de trabajo - Más flexible con coincidencias parciales
      if (filters.workType) {
        // Mapa de posibles variaciones para cada tipo de trabajo
        const workTypeVariations: Record<string, string[]> = {
          'Remote': ['remote', 'remoto', 'teletrabajo', 'trabajo remoto', 'home office', 'virtual'],
          'OnSite': ['onsite', 'on-site', 'on site', 'presencial', 'oficina', 'in office', 'in-office'],
          'Hybrid': ['hybrid', 'híbrido', 'mixto', 'flexible']
        };
        
        if (Array.isArray(filters.workType)) {
          // Expandir cada tipo de trabajo a sus variaciones
          const expandedTypes: string[] = [];
          filters.workType.forEach(type => {
            if (type) { // Verificar que el tipo no sea null o undefined
              const variations = workTypeVariations[type] || [type.toLowerCase()];
              expandedTypes.push(...variations);
            }
          });
          
          // Crear condiciones OR para cada variación usando Raw solo si hay tipos expandidos
          if (expandedTypes.length > 0) {
            const condition = this.createSafeLikeCondition(expandedTypes);
            if (condition) {
              whereConditions.workType = condition;
            }
          }
          console.log('Expanded workType variations:', expandedTypes);
        } else {
          const variations = workTypeVariations[filters.workType] || [filters.workType.toLowerCase()];
          if (variations.length > 1) {
            const condition = this.createSafeLikeCondition(variations);
            if (condition) {
              whereConditions.workType = condition;
            }
          } else if (variations.length === 1) {
            whereConditions.workType = Like(`%${variations[0]}%`);
          }
          console.log('Expanded workType variations:', variations);
        }
      }
  
      // Filtros de horario de trabajo - Similar al workType, más flexible
      if (filters.workScheduleType) {
        const scheduleVariations: Record<string, string[]> = {
          'FullTime': ['full time', 'full-time', 'tiempo completo', 'jornada completa', 'tiempo-completo'],
          'PartTime': ['part time', 'part-time', 'medio tiempo', 'tiempo parcial', 'por horas'],
          'Contract': ['contract', 'contrato', 'temporal', 'por proyecto'],
          'Internship': ['internship', 'intern', 'pasantía', 'prácticas', 'trainee']
        };
        
        if (Array.isArray(filters.workScheduleType)) {
          const expandedTypes: string[] = [];
          filters.workScheduleType.forEach(type => {
            if (type) { // Verificar que el tipo no sea null o undefined
              const variations = scheduleVariations[type] || [type.toLowerCase()];
              expandedTypes.push(...variations);
            }
          });
          
          if (expandedTypes.length > 0) {
            const condition = this.createSafeLikeCondition(expandedTypes);
            if (condition) {
              whereConditions.workScheduleType = condition;
            }
          }
        } else {
          const variations = scheduleVariations[filters.workScheduleType] || [filters.workScheduleType.toLowerCase()];
          if (variations.length > 1) {
            const condition = this.createSafeLikeCondition(variations);
            if (condition) {
              whereConditions.workScheduleType = condition;
            }
          } else if (variations.length === 1) {
            whereConditions.workScheduleType = Like(`%${variations[0]}%`);
          }
        }
      }
  
      // Filtros de nivel de experiencia
      if (filters.levelExperience) {
        const experienceVariations: Record<string, string[]> = {
          'Entry': ['entry', 'entry level', 'junior', 'trainee', 'principiante', 'sin experiencia'],
          'Junior': ['junior', 'jr', 'jr.', 'entry level', 'principiante'],
          'Mid': ['mid', 'mid level', 'medio', 'intermedio', 'semi senior', 'semi-senior'],
          'Senior': ['senior', 'sr', 'sr.', 'expert', 'experto', 'avanzado']
        };
        
        if (Array.isArray(filters.levelExperience)) {
          const expandedLevels: string[] = [];
          filters.levelExperience.forEach(level => {
            if (level) { // Verificar que el nivel no sea null o undefined
              const variations = experienceVariations[level] || [level.toLowerCase()];
              expandedLevels.push(...variations);
            }
          });
          
          if (expandedLevels.length > 0) {
            const condition = this.createSafeLikeCondition(expandedLevels);
            if (condition) {
              whereConditions.levelExperience = condition;
            }
          }
        } else {
          const variations = experienceVariations[filters.levelExperience] || [filters.levelExperience.toLowerCase()];
          if (variations.length > 1) {
            const condition = this.createSafeLikeCondition(variations);
            if (condition) {
              whereConditions.levelExperience = condition;
            }
          } else if (variations.length === 1) {
            whereConditions.levelExperience = Like(`%${variations[0]}%`);
          }
        }
      }
  
      // Filtros de área o sector - Búsqueda case-insensitive
      if (filters.area) {
        if (Array.isArray(filters.area)) {
          // Filtrar valores null o undefined antes de procesar
          const validAreas = filters.area.filter(area => area != null);
          const areas = validAreas.map(area => area.toLowerCase());
          if (areas.length > 0) {
            const condition = this.createSafeLikeCondition(areas);
            if (condition) {
              whereConditions.area = condition;
            }
          }
        } else if (filters.area) { // Verificar que no sea null o undefined
          whereConditions.area = Like(`%${filters.area.toLowerCase()}%`);
        }
      }
  
      // Filtros de reputación de empresa - Hacerlo más flexible
      if (filters.companyReputation) {
        // Reducir ligeramente el umbral de reputación para obtener más resultados
        const flexibleReputation = Math.max(1, filters.companyReputation - 1);
        whereConditions.companyReputation = MoreThanOrEqual(flexibleReputation);
        console.log(`Adjusted companyReputation filter from ${filters.companyReputation} to ${flexibleReputation}`);
      }
  
      // Filtros de oportunidades de crecimiento
      if (filters.hasGrowthOpportunities !== undefined) {
        whereConditions.hasGrowthOpportunities = filters.hasGrowthOpportunities;
      }
  
      // Filtros de inclusión de discapacidad
      if (filters.disabilityInclusion !== undefined) {
        whereConditions.disabilityInclusion = filters.disabilityInclusion;
      }
  
      // Filtros de fecha de publicación - Extender el rango de tiempo
      if (filters.datePosted) {
        const now = new Date();
        let startDate: Date;
  
        switch (filters.datePosted) {
          case 'last24h':
            startDate = new Date(now.getTime() - 36 * 60 * 60 * 1000); // 36 horas en lugar de 24
            break;
          case 'last7d':
            startDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // 10 días en lugar de 7
            break;
          case 'last30d':
            startDate = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000); // 45 días en lugar de 30
            break;
          default:
            startDate = new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000); // 120 días en lugar de 90
        }
  
        whereConditions.scrapedAt = MoreThanOrEqual(startDate);
      }
  
      // Filtros por empresas específicas - Búsqueda case-insensitive
      if (filters.companies && Array.isArray(filters.companies) && filters.companies.length > 0) {
        // Filtrar valores null o undefined antes de procesar
        const validCompanies = filters.companies.filter(company => company != null);
        if (validCompanies.length > 0) {
          const companies = validCompanies.map(company => company.toLowerCase());
          const condition = this.createSafeLikeCondition(companies);
          if (condition) {
            whereConditions.Company = condition;
          }
        }
      }
    } catch (error) {
      console.error('Error applying filters:', error);
      console.error('Original filters:', originalFilters);
    }
  }

  isJobLikedByUser(job: Jobs, jobLikes: JobLikes[]): boolean {
    const result = jobLikes.some(like => like.job.uid === job.uid);
    return result;
  }

  /**
   * Calcula el score MCDA para una oferta de empleo.
   */
  private calculateMCDAScore(job: Jobs, user: User, weights: Weights): number {
    // Validar y proporcionar valores por defecto para los pesos si no existen
    const defaultWeights: Weights = {
      overall: { economic: 0.5, professional: 0.5 },
      economic: { salary: 0.4, location: 0.3, workType: 0.3 },
      professional: { relevance: 0.4, company: 0.3, opportunities: 0.3 }
    };

    // Asegurarse de que todas las propiedades necesarias existan
    const safeWeights: Weights = {
      overall: {
        economic: weights?.overall?.economic ?? defaultWeights.overall.economic,
        professional: weights?.overall?.professional ?? defaultWeights.overall.professional
      },
      economic: {
        salary: weights?.economic?.salary ?? defaultWeights.economic.salary,
        location: weights?.economic?.location ?? defaultWeights.economic.location,
        workType: weights?.economic?.workType ?? defaultWeights.economic.workType
      },
      professional: {
        relevance: weights?.professional?.relevance ?? defaultWeights.professional.relevance,
        company: weights?.professional?.company ?? defaultWeights.professional.company,
        opportunities: weights?.professional?.opportunities ?? defaultWeights.professional.opportunities
      }
    };

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
      safeWeights.economic.salary * salaryScore +
      safeWeights.economic.location * locationScore +
      safeWeights.economic.workType * workTypeScore;

    // Criterios de Desarrollo profesional
    const relevanceScore = this.calculateTitleRelevance(job.title, user); // B1
    const companyScore = job.companyReputation ? job.companyReputation / 10 : 0.5; // B2
    const opportunitiesScore =
      (job.hasGrowthOpportunities || (job.growthOpportunitiesDescription && job.growthOpportunitiesDescription.trim() !== "")) ? 1 : 0; // B3

    // Puntuación profesional ponderada usando los pesos definidos en weights.professional
    const professionalScore =
      safeWeights.professional.relevance * relevanceScore +
      safeWeights.professional.company * companyScore +
      safeWeights.professional.opportunities * opportunitiesScore;

    // Puntuación final: combinación ponderada usando los pesos globales de cada criterio
    const finalScore =
      safeWeights.overall.economic * economicScore +
      safeWeights.overall.professional * professionalScore;

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

  /**
   * Obtiene los valores distintos para las columnas usadas como filtros.
   */
  async getDistinctFilterValues(): Promise<{
    modalities: string[];
    contractTypes: string[];
    workSchedules: string[];
    experienceLevels: string[];
  }> {
    const queryBuilder = this._jobsRepository.createQueryBuilder("job");

    // Helper para obtener valores distintos
    const getDistinctValues = async (columnName: string): Promise<string[]> => {
      const results = await queryBuilder
        .select(`DISTINCT job.${columnName}`, columnName)
        .where(`job.${columnName} IS NOT NULL AND job.${columnName} != ''`)
        .orderBy(`job.${columnName}`, 'ASC')
        .getRawMany();
      return results.map(result => result[columnName]);
    };

    // Obtener valores para cada filtro
    const modalities = await getDistinctValues('workType'); 
    const contractTypes = await getDistinctValues('workScheduleType'); 
    const workSchedules = contractTypes; 
    const experienceLevels = await getDistinctValues('levelExperience'); 

    return {
      modalities,
      contractTypes,
      workSchedules, 
      experienceLevels,
    };
  }

}
