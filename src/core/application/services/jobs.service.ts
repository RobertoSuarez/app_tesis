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
import { NotificationsService } from "./notifications.service";

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
  private _notificationsService: NotificationsService;
  private _cache: Record<string, {data: any, timestamp: number}> = {};

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
    this._notificationsService = new NotificationsService(_clienteSQL);
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
            const savedJob = await this._jobsRepository.save(job);
            
            // Notificar a los usuarios sobre el nuevo trabajo
            try {
              // Obtener usuarios que podrían estar interesados en este trabajo
              // Por ejemplo, usuarios que han buscado términos relacionados
              const recentSearches = await this._searchRepository.find({
                where: {},
                relations: ['user'],
                order: { createdAt: 'DESC' },
                take: 20
              });
              
              // Crear un conjunto para evitar notificaciones duplicadas
              const notifiedUsers = new Set<string>();
              
              for (const search of recentSearches) {
                if (search.user && search.user.uid && !notifiedUsers.has(search.user.uid)) {
                  // Registrar notificación para el usuario
                  await this._notificationsService.registerNotifications({
                    userUID: search.user.uid,
                    title: 'Nuevo trabajo disponible',
                    body: `Se ha publicado un nuevo trabajo: ${savedJob.title} en ${savedJob.Company || 'una empresa'}. ¡Revísalo ahora!`
                  });
                  
                  // Marcar usuario como notificado
                  notifiedUsers.add(search.user.uid);
                }
              }
            } catch (error) {
              console.error('Error al enviar notificaciones de nuevo trabajo:', error);
            }
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
    // Usar caché para búsquedas recientes con los mismos parámetros
    const cacheKey = this.generateCacheKey(userId, search, filters, sort, pagination);
    const cachedResult = await this.getFromCache(cacheKey);
    if (cachedResult) {
      console.log('Returning cached result for:', cacheKey);
      return cachedResult;
    }

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
      
      // Lista ampliada de términos técnicos que deben preservarse incluso si son cortos
      const technicalTerms = [
        '.net', 'c#', 'php', 'ios', 'aws', 'c++', 'sql', 'api', 'ui', 'ux', 'qa', 'js', 'net', 'asp', 'vue', 'go', 'r', 'ml', 'ai', 'iot',
        'css', 'html', 'java', 'node', 'npm', 'git', 'rest', 'soap', 'xml', 'json', 'spa', 'pwa', 'seo', 'ci', 'cd', 'orm', 'mvc', 'mvvm',
        'tdd', 'bdd', 'ddd', 'agile', 'scrum', 'kanban', 'devops', 'azure', 'gcp', 'saas', 'paas', 'iaas', 'nosql', 'db', 'ts'
      ];
      
      // Mapa de sinónimos para mejorar la búsqueda
      const synonymsMap: Record<string, string[]> = {
        '.net': ['.net', 'dotnet', 'dot net', 'asp.net', 'asp net', 'net core', '.net core', 'c#'],
        'javascript': ['javascript', 'js', 'ecmascript', 'typescript', 'ts'],
        'frontend': ['frontend', 'front-end', 'front end', 'ui', 'ux', 'interface'],
        'backend': ['backend', 'back-end', 'back end', 'server-side', 'api'],
        'fullstack': ['fullstack', 'full-stack', 'full stack', 'frontend backend'],
        'desarrollador': ['desarrollador', 'developer', 'programador', 'ingeniero software', 'software engineer'],
        'remoto': ['remoto', 'remote', 'trabajo remoto', 'home office', 'teletrabajo', 'work from home']
      };
      
      // Normalizar la búsqueda
      const normalizedSearch = search.trim().toLowerCase();
      
      // Comprobar si la búsqueda coincide con alguna clave de sinónimos
      let useSynonyms = false;
      let synonymTerms: string[] = [];
      
      for (const [key, synonyms] of Object.entries(synonymsMap)) {
        if (normalizedSearch === key || synonyms.includes(normalizedSearch)) {
          console.log(`Caso especial para ${key} detectado`);
          synonymTerms = synonyms;
          useSynonyms = true;
          break;
        }
      }
      
      // Tokenizar la búsqueda para mejorar los resultados
      let searchTerms: string[] = [];
      
      if (useSynonyms) {
        // Usar los sinónimos predefinidos
        searchTerms = synonymTerms;
      } else {
        // Tokenización avanzada con manejo de frases entre comillas
        const phraseRegex = /"([^"]+)"|'([^']+)'/g;
        const phrases: string[] = [];
        let plainSearch = normalizedSearch;
        
        // Extraer frases entre comillas
        let match;
        while ((match = phraseRegex.exec(normalizedSearch)) !== null) {
          const phrase = match[1] || match[2]; // Captura del grupo 1 o 2
          phrases.push(phrase);
          plainSearch = plainSearch.replace(match[0], ''); // Eliminar la frase del texto de búsqueda
        }
        
        // Procesar el resto del texto
        const words = plainSearch.split(/\s+/).filter(term => {
          // Mantener términos técnicos conocidos o términos con longitud > 2
          return technicalTerms.includes(term.toLowerCase()) || term.length > 2;
        });
        
        // Combinar frases y palabras
        searchTerms = [...phrases, ...words].filter(term => term.trim() !== '');
      }
      
      console.log('Search terms:', searchTerms);
      
      // Si no hay términos válidos después de filtrar, usar el término original completo
      const termsToUse = searchTerms.length > 0 ? searchTerms : [search.trim()];
      
      // Crear condiciones para cada término de búsqueda en cada campo con ponderación
      whereConditions = [];
      const fieldWeightMap = new Map(searchFields.map(sf => [sf.field, sf.weight]));
      
      // Usar QueryBuilder para búsquedas más eficientes
      if (termsToUse.length > 0) {
        // Crear condiciones para cada campo y término con ponderación de relevancia
        termsToUse.forEach(term => {
          // Usar ILIKE para búsqueda insensible a mayúsculas/minúsculas (PostgreSQL)
          // o LOWER + LIKE para otras bases de datos
          searchFields.forEach(({ field, weight }) => {
            // Crear condición con peso de relevancia
            const condition: any = {};
            // Usar Raw para búsqueda más eficiente y segura contra inyección SQL
            condition[field] = Raw(alias => {
              // Usar LIKE con comodines al inicio y final para búsqueda parcial
              // Escapar comillas simples para prevenir inyección SQL
              const escapedTerm = term.replace(/'/g, "''");
              return `LOWER(${alias}) LIKE LOWER('%${escapedTerm}%')`;
            });
            // Añadir peso al campo para cálculos posteriores
            condition['_weight'] = weight;
            whereConditions.push(condition);
          });
        });
      }
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
    
    // ENFOQUE EN DOS FASES:
    // 1. Primero buscar hasta 200 empleos usando solo el término de búsqueda
    // 2. Luego aplicar los filtros adicionales a esos resultados
    
    console.log('Iniciando búsqueda en dos fases...');
    
    // Fase 1: Buscar empleos usando solo el término de búsqueda
    let searchOnlyConditions: any;
    let initialJobsIds: string[] = [];
    
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
    
    // Solo realizar la búsqueda inicial si hay un término de búsqueda
    if (Array.isArray(whereConditions) && whereConditions.length > 0) {
      // Preparar condiciones de búsqueda sin los pesos
      searchOnlyConditions = whereConditions.map(({ _weight, ...rest }) => rest);
      
      console.log('Fase 1: Buscando empleos con el término de búsqueda...');
      
      // Buscar hasta 200 empleos que coincidan con el término de búsqueda
      const initialJobs = await this._jobsRepository.find({
        where: searchOnlyConditions,
        take: 200, // Limitar a 200 resultados para la primera fase
        order: orderOptions,
        select: ['uid'], // Solo necesitamos los IDs para la segunda fase
        cache: true
      });
      
      // Extraer los IDs de los empleos encontrados
      initialJobsIds = initialJobs.map(job => job.uid);
      console.log(`Fase 1 completada: ${initialJobsIds.length} empleos encontrados.`);
    }
    
    // Fase 2: Aplicar filtros adicionales
    let finalWhereConditions: any;
    
    // Si tenemos resultados de la fase 1 y hay filtros adicionales
    if (initialJobsIds.length > 0 && Object.keys(filterConditions).length > 0) {
      console.log('Fase 2: Aplicando filtros adicionales a los resultados iniciales...');
      
      // Combinar la condición de IDs con los filtros adicionales
      finalWhereConditions = {
        uid: In(initialJobsIds), // Usar solo los IDs de la fase 1
        ...filterConditions     // Aplicar los filtros adicionales
      };
    } 
    // Si tenemos resultados de la fase 1 pero no hay filtros adicionales
    else if (initialJobsIds.length > 0) {
      // Usar solo los IDs de la fase 1
      finalWhereConditions = { uid: In(initialJobsIds) };
    }
    // Si no hay resultados de la fase 1 pero hay un término de búsqueda
    else if (Array.isArray(whereConditions) && whereConditions.length > 0) {
      // Usar las condiciones de búsqueda originales con los filtros
      if (Object.keys(filterConditions).length > 0) {
        const searchConditions = whereConditions.map(({ _weight, ...rest }) => rest);
        finalWhereConditions = [
          ...searchConditions.map(searchCondition => ({
            ...searchCondition,
            ...filterConditions
          }))
        ];
      } else {
        finalWhereConditions = whereConditions.map(({ _weight, ...rest }) => rest);
      }
    }
    // Si no hay término de búsqueda, usar solo los filtros
    else {
      finalWhereConditions = filterConditions;
    }
    
    console.log('Condiciones finales:', JSON.stringify(finalWhereConditions));

    // Configurar opciones de paginación
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 40;
    const skip = (page - 1) * limit;

    // Usar un contador optimizado para grandes conjuntos de datos
    const totalCount = await this._jobsRepository.count({
      where: finalWhereConditions,
    });

    // Obtener los trabajos con paginación
    const jobs: Jobs[] = await this._jobsRepository.find({
      where: finalWhereConditions,
      skip: skip,
      take: limit,
      order: orderOptions,
      relations: ['platform'],
      cache: true // Habilitar caché de TypeORM para esta consulta
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

    const result = {
      jobs: scoredJobs,
      total: totalCount,
      page,
      totalPages
    };

    // Guardar en caché para futuras consultas
    await this.saveToCache(cacheKey, result);

    return result;
  }

  /**
   * Genera una clave única para la caché basada en los parámetros de búsqueda
   */
  private generateCacheKey(
    userId: string,
    search: string,
    filters?: JobFilters,
    sort?: SortOptions,
    pagination?: PaginationOptions
  ): string {
    return JSON.stringify({
      userId,
      search: search?.trim().toLowerCase() || '',
      filters: filters || {},
      sort: sort || {},
      page: pagination?.page || 1,
      limit: pagination?.limit || 40
    });
  }

  /**
   * Obtiene resultados de la caché
   */
  private async getFromCache(key: string): Promise<any> {
    // Implementar con Redis, Memcached o almacenamiento en memoria
    // Por ahora, implementación simple en memoria
    const cacheExpiration = 5 * 60 * 1000; // 5 minutos en milisegundos
    const now = Date.now();
    
    // Verificar si la clave existe en la caché y no ha expirado
    if (this._cache && this._cache[key] && (now - this._cache[key].timestamp) < cacheExpiration) {
      return this._cache[key].data;
    }
    
    return null;
  }

  /**
   * Guarda resultados en la caché
   */
  private async saveToCache(key: string, data: any): Promise<void> {
    // Implementar con Redis, Memcached o almacenamiento en memoria
    // Por ahora, implementación simple en memoria
    if (!this._cache) {
      this._cache = {};
    }
    
    this._cache[key] = {
      data,
      timestamp: Date.now()
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
   * Calcula el score MCDA para una oferta de empleo utilizando un enfoque mejorado.
   * Incorpora factores adicionales como la recencia de la oferta y aplica normalización.
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

    // Normalizar los pesos para asegurar que sumen 1.0 en cada categoría
    this.normalizeWeights(safeWeights);

    // ===== CRITERIOS DE DESARROLLO ECONÓMICO =====
    
    // A1: Salario - Evalúa la compatibilidad entre el rango salarial ofrecido y las expectativas del usuario
    const salaryScore = this.calculateSalaryScore(
      job.hasSalaryRange,
      job.salaryMin,
      job.salaryMax,
      user.expectedSalaryMin,
      user.expectedSalaryMax
    );

    // A2: Ubicación - Evalúa la compatibilidad geográfica entre la oferta y las preferencias del usuario
    const locationScore = this.calculateLocationScore(job.Location, user.city?.name);
    
    // A3: Tipo/Modalidad de trabajo - Evalúa la compatibilidad entre la modalidad ofrecida y las preferencias
    const workTypeScore = this.calculateWorkTypeScore(job.workType, user.preferredWorkType);

    // Puntuación económica ponderada usando los pesos normalizados
    const economicScore =
      safeWeights.economic.salary * salaryScore +
      safeWeights.economic.location * locationScore +
      safeWeights.economic.workType * workTypeScore;

    // ===== CRITERIOS DE DESARROLLO PROFESIONAL =====
    
    // B1: Relevancia - Evalúa la relevancia del título con respecto al perfil del usuario
    const relevanceScore = this.calculateTitleRelevance(job.title, user);
    
    // B2: Empresa - Evalúa la reputación de la empresa
    const companyScore = job.companyReputation ? job.companyReputation / 10 : 0.5;
    
    // B3: Oportunidades de crecimiento - Evalúa las oportunidades de desarrollo profesional
    const opportunitiesScore = this.calculateOpportunitiesScore(
      job.hasGrowthOpportunities,
      job.growthOpportunitiesDescription
    );

    // Puntuación profesional ponderada usando los pesos normalizados
    const professionalScore =
      safeWeights.professional.relevance * relevanceScore +
      safeWeights.professional.company * companyScore +
      safeWeights.professional.opportunities * opportunitiesScore;

    // ===== FACTOR DE RECENCIA =====
    // Aplicar un bonus por recencia (ofertas más recientes reciben una pequeña bonificación)
    const recencyBonus = this.calculateRecencyBonus(job.scrapedAt || job.createdAt);

    // ===== PUNTUACIÓN FINAL =====
    // Combinación ponderada usando los pesos globales de cada criterio más el bonus de recencia
    let finalScore =
      safeWeights.overall.economic * economicScore +
      safeWeights.overall.professional * professionalScore;
    
    // Aplicar el bonus de recencia (máximo 10% de bonificación)
    finalScore = finalScore * (1 + recencyBonus);

    // Asegurar que el puntaje final esté en el rango [0,1]
    return Math.max(0, Math.min(finalScore, 1));
  }

  /**
   * Calcula la relevancia del título del trabajo comparándolo con el historial del usuario.
   */
  private calculateTitleRelevance(title: string, user: User): number {
    if (!title || !user.jobHistory || user.jobHistory.length === 0) return 0.5;
    
    const userSkills = user.jobHistory.map((job) => job.jobTitle).join(' ').toLowerCase();
    const titleKeywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    if (titleKeywords.length === 0) return 0.5;
    
    let matchCount = 0;
    titleKeywords.forEach((word) => {
      if (userSkills.includes(word)) {
        matchCount += 1;
      }
    });
    
    return Math.min(matchCount / titleKeywords.length, 1);
  }

  /**
   * Calcula la similitud de la ubicación.
   */
  private calculateLocationScore(jobLocation: string, userCity: string): number {
    if (!jobLocation || !userCity) return 0.5;
    
    const normalizedJobLocation = jobLocation.toLowerCase();
    const normalizedUserCity = userCity.toLowerCase();
    
    if (normalizedJobLocation.includes(normalizedUserCity)) {
      return 1;
    } else if (
      normalizedJobLocation.includes('remoto') || 
      normalizedJobLocation.includes('remote') ||
      normalizedJobLocation.includes('teletrabajo') ||
      normalizedJobLocation.includes('home office')
    ) {
      return 0.8;
    } else {
      return 0.3;
    }
  }

  /**
   * Normaliza los pesos para asegurar que sumen 1.0 en cada categoría.
   */
  private normalizeWeights(weights: Weights): void {
    // Normalizar pesos globales
    const overallSum = weights.overall.economic + weights.overall.professional;
    if (overallSum > 0) {
      weights.overall.economic /= overallSum;
      weights.overall.professional /= overallSum;
    }

    // Normalizar pesos económicos
    const economicSum = weights.economic.salary + weights.economic.location + weights.economic.workType;
    if (economicSum > 0) {
      weights.economic.salary /= economicSum;
      weights.economic.location /= economicSum;
      weights.economic.workType /= economicSum;
    }

    // Normalizar pesos profesionales
    const professionalSum = weights.professional.relevance + weights.professional.company + weights.professional.opportunities;
    if (professionalSum > 0) {
      weights.professional.relevance /= professionalSum;
      weights.professional.company /= professionalSum;
      weights.professional.opportunities /= professionalSum;
    }
  }

  /**
   * Calcula un bonus basado en la recencia de la oferta.
   * Las ofertas más recientes reciben una pequeña bonificación.
   */
  private calculateRecencyBonus(date: Date): number {
    if (!date) return 0;
    
    const now = new Date();
    const jobDate = new Date(date);
    const ageInDays = (now.getTime() - jobDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // Ofertas de menos de 7 días reciben bonus máximo
    if (ageInDays <= 7) {
      return 0.1; // 10% de bonus
    }
    // Ofertas entre 7 y 30 días reciben bonus proporcional
    else if (ageInDays <= 30) {
      return 0.1 * (1 - ((ageInDays - 7) / 23)); // Decrece linealmente de 10% a 0%
    }
    // Ofertas de más de 30 días no reciben bonus
    else {
      return 0;
    }
  }

  /**
   * Evalúa las oportunidades de crecimiento profesional en la oferta.
   */
  private calculateOpportunitiesScore(hasOpportunities?: boolean, description?: string): number {
    // Si se indica explícitamente que hay oportunidades de crecimiento
    if (hasOpportunities === true) {
      return 1.0;
    }
    
    // Si hay una descripción de oportunidades de crecimiento
    if (description && description.trim() !== '') {
      // Analizar la calidad de la descripción (longitud como proxy simple)
      const words = description.trim().split(/\s+/).length;
      if (words > 30) return 0.9;  // Descripción detallada
      if (words > 15) return 0.7;  // Descripción moderada
      return 0.5;                  // Descripción básica
    }
    
    // Sin información sobre oportunidades
    return 0.0;
  }



  /**
   * Calcula la puntuación de la empresa basada en su reputación y nombre.
   */
  private calculateCompanyScore(companyName: string, companyReputation?: number): number {
    // Si hay una puntuación de reputación explícita, usarla (normalizada a [0,1])
    if (companyReputation !== undefined && companyReputation !== null) {
      return companyReputation / 10;
    }
    
    // Si no hay puntuación pero hay nombre de empresa, dar una puntuación base
    if (companyName && companyName.trim() !== '') {
      // Aquí se podría implementar una lógica para reconocer empresas conocidas
      // Por ahora, damos una puntuación neutral
      return 0.5;
    }
    
    // Si no hay información de la empresa, puntuación baja
    return 0.3;
  }

  /**
   * Evalúa las oportunidades de crecimiento profesional en la oferta.
   */
  // private calculateOpportunitiesScore(hasOpportunities?: boolean, description?: string): number {
  //   // Si se indica explícitamente que hay oportunidades de crecimiento
  //   if (hasOpportunities === true) {
  //     return 1.0;
  //   }
    
  //   // Si hay una descripción de oportunidades de crecimiento
  //   if (description && description.trim() !== '') {
  //     // Analizar la calidad de la descripción (longitud como proxy simple)
  //     const words = description.trim().split(/\s+/).length;
  //     if (words > 30) return 0.9;  // Descripción detallada
  //     if (words > 15) return 0.7;  // Descripción moderada
  //     return 0.5;                  // Descripción básica
  //   }
    
  //   // Sin información sobre oportunidades
  //   return 0.0;
  // }

  /**
   * Versión mejorada del cálculo de relevancia del título del trabajo.
   * Incluye análisis del título y la descripción comparándolos con el historial del usuario.
   */
  private calculateEnhancedTitleRelevance(title: string, description: string, user: User): number {
    if (!title) return 0.5;
    
    // Obtener habilidades y experiencia del usuario
    const userSkills = user.jobHistory.map(job => job.jobTitle).join(' ').toLowerCase();
    const userKeywords = userSkills.split(/\s+/).filter(word => word.length > 2);
    
    // Analizar el título del trabajo
    const titleKeywords = title.toLowerCase().split(/\s+/).filter(word => word.length > 2);
    
    // Analizar la descripción del trabajo (si está disponible)
    const descriptionKeywords = description ? 
      description.toLowerCase().split(/\s+/).filter(word => word.length > 2) : [];
    
    // Combinar keywords del título (con mayor peso) y descripción
    const jobKeywords = [...titleKeywords, ...descriptionKeywords.slice(0, 50)];
    
    // Calcular coincidencias
    let matchCount = 0;
    let totalKeywords = 0;
    
    // Dar mayor peso a las coincidencias en el título
    titleKeywords.forEach(keyword => {
      if (userKeywords.includes(keyword)) {
        matchCount += 2; // Mayor peso para coincidencias en el título
      }
      totalKeywords += 2;
    });
    
    // Menor peso a las coincidencias en la descripción
    descriptionKeywords.slice(0, 50).forEach(keyword => {
      if (userKeywords.includes(keyword)) {
        matchCount += 1;
      }
      totalKeywords += 1;
    });
    
    // Si no hay keywords para comparar, dar un valor neutral
    if (totalKeywords === 0) return 0.5;
    
    // Normalizar el resultado al rango [0,1]
    return Math.min(matchCount / totalKeywords * 1.5, 1); // Multiplicador para dar más peso a coincidencias parciales
  }

  /**
   * Versión mejorada del cálculo de compatibilidad de ubicación.
   * Considera diferentes niveles de compatibilidad geográfica.
   */
  private calculateEnhancedLocationScore(jobLocation: string, userCity: string): number {
    if (!jobLocation || !userCity) return 0.5; // Valor neutral si falta información
    
    const normalizedJobLocation = jobLocation.toLowerCase();
    const normalizedUserCity = userCity.toLowerCase();
    
    // Coincidencia exacta o trabajo remoto
    if (normalizedJobLocation.includes(normalizedUserCity)) {
      return 1.0; // Coincidencia perfecta
    }
    
    // Trabajo remoto o híbrido
    if (normalizedJobLocation.includes('remoto') || 
        normalizedJobLocation.includes('remote') || 
        normalizedJobLocation.includes('teletrabajo') || 
        normalizedJobLocation.includes('home office') ||
        normalizedJobLocation.includes('híbrido') || 
        normalizedJobLocation.includes('hybrid')) {
      return 0.9; // Muy buena compatibilidad
    }
    
    // Podría implementarse una lógica más avanzada con distancias geográficas
    // Por ejemplo, verificar si la ubicación está en la misma provincia/estado
    
    // Por ahora, valor bajo para ubicaciones diferentes
    return 0.3;
  }

  /**
   * Versión mejorada del cálculo de compatibilidad del tipo de trabajo.
   * Considera diferentes modalidades y sus compatibilidades.
   */
  private calculateEnhancedWorkTypeScore(jobWorkType: string, userPreferredWorkType: string): number {
    if (!jobWorkType || !userPreferredWorkType) return 0.5; // Valor neutral si falta información
    
    const normalizedJobType = jobWorkType.toLowerCase();
    const normalizedUserType = userPreferredWorkType.toLowerCase();
    
    // Coincidencia exacta
    if (normalizedJobType.includes(normalizedUserType)) {
      return 1.0;
    }
    
    // Compatibilidades especiales
    
    // Si el usuario prefiere remoto
    if (normalizedUserType.includes('remoto') || normalizedUserType.includes('remote')) {
      // Y el trabajo es híbrido
      if (normalizedJobType.includes('híbrido') || normalizedJobType.includes('hybrid')) {
        return 0.8; // Buena compatibilidad
      }
      // Si el trabajo es presencial
      if (normalizedJobType.includes('presencial') || normalizedJobType.includes('oficina')) {
        return 0.3; // Baja compatibilidad
      }
    }
    
    // Si el usuario prefiere híbrido
    if (normalizedUserType.includes('híbrido') || normalizedUserType.includes('hybrid')) {
      // Y el trabajo es remoto
      if (normalizedJobType.includes('remoto') || normalizedJobType.includes('remote')) {
        return 0.7; // Compatibilidad moderada
      }
      // Si el trabajo es presencial
      if (normalizedJobType.includes('presencial') || normalizedJobType.includes('oficina')) {
        return 0.6; // Compatibilidad moderada
      }
    }
    
    // Si el usuario prefiere presencial
    if (normalizedUserType.includes('presencial') || normalizedUserType.includes('oficina')) {
      // Y el trabajo es híbrido
      if (normalizedJobType.includes('híbrido') || normalizedJobType.includes('hybrid')) {
        return 0.7; // Compatibilidad moderada
      }
      // Si el trabajo es remoto
      if (normalizedJobType.includes('remoto') || normalizedJobType.includes('remote')) {
        return 0.4; // Baja compatibilidad
      }
    }
    
    // Si no hay coincidencia clara, valor bajo-moderado
    return 0.4;
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
