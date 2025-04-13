import { Request, Response } from "express";
import { User } from "../../../core/domain/entities/user.entity";
import { JobsService, Weights } from "../../../core/application/services/jobs.service";

export const defaultWeights: Weights = {
    overall: {
        economic: 0.5,      // 50% del score final para criterios económicos
        professional: 0.5,  // 50% del score final para criterios profesionales
    },
    economic: {
        salary: 0.4,        // A1: Salario
        location: 0.3,      // A2: Ubicación
        workType: 0.3,      // A3: Tipo de trabajo
    },
    professional: {
        relevance: 0.4,     // B1: Relevancia
        company: 0.3,       // B2: Empresa
        opportunities: 0.3, // B3: Oportunidades
    },
};

export interface SearchMCDA {
    search: string;
    weights: Weights;
    filters?: JobFilters;
    sort?: SortOptions;
    pagination?: PaginationOptions;
}

export interface JobFilters {
    workType?: string | string[];          // Remote, OnSite, Hybrid
    workScheduleType?: string | string[];  // FullTime, PartTime, Contract, Internship
    location?: string | string[];          // City or region
    levelExperience?: string | string[];   // Entry, Junior, Mid, Senior, etc.
    salaryMin?: number;                    // Minimum salary
    salaryMax?: number;                    // Maximum salary
    hasSalaryRange?: boolean;              // Only jobs with salary information
    area?: string | string[];              // Job sector/industry
    companyReputation?: number;            // Minimum company reputation
    hasGrowthOpportunities?: boolean;      // Jobs with growth opportunities
    disabilityInclusion?: boolean;         // Jobs with disability inclusion
    datePosted?: string;                   // Filter by date posted (e.g., 'last24h', 'last7d', 'last30d')
    companies?: string[];                  // Filter by specific companies
}

export interface SortOptions {
    field: string;        // Field to sort by: 'score', 'salary', 'datePosted', 'companyReputation', etc.
    direction: 'ASC' | 'DESC'; // Sort direction
}

export interface PaginationOptions {
    page: number;         // Page number (starting from 1)
    limit: number;        // Number of items per page
}



export class JobsController {
    constructor(
        private _jobsService: JobsService
    ) { }

    async getJobs(req: Request, res: Response) {
        const { user }: { user: User } = req['user'];
        // const search = req.query["search"] as string;

        const body = req.body as SearchMCDA;

        try {
            const { jobs, total, page, totalPages } = await this._jobsService.getJobs(
                user.uid, 
                body.search, 
                body.weights, 
                body.filters, 
                body.sort, 
                body.pagination
            );

            return res.json({
                status: 'success',
                length: jobs.length,
                total,
                page,
                totalPages,
                jobs,
            });
        } catch (error) {
            console.error('Error in getJobs controller:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Error retrieving jobs',
            });
        }
    }

    async getJobByID(req: Request, res: Response) {
        const { uid } = req.params;

        const result = await this._jobsService.getJobByID(uid);
        return res.json({
            status: 'success',
            data: result,
        });
    }

    async scrapingJobs(req: Request, res: Response) {
        const { amount } = req.body;
        await this._jobsService.webScrapingJobs(amount);
        return res.json({
            message: 'se ha scrapeado todo',
        })
    }

    /**
     * Obtiene las estadísticas de scraping
     * @param req Request - puede incluir query params platform y limit
     * @param res Response
     * @returns JSON con las estadísticas de scraping
     */
    async getScrapingStats(req: Request, res: Response) {
        try {
            const platform = req.query.platform as string;
            const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;

            const stats = await this._jobsService.getScrapingStats(platform, limit);
            
            // Calcular la tasa de éxito promedio si hay estadísticas
            let averageSuccessRate = 0;
            if (stats.length > 0) {
                averageSuccessRate = stats.reduce((acc, stat) => acc + stat.successRate, 0) / stats.length;
            }

            return res.json({
                status: 'success',
                data: {
                    stats,
                    averageSuccessRate: parseFloat(averageSuccessRate.toFixed(2)),
                    totalRecords: stats.length
                }
            });
        } catch (error) {
            return res.status(500).json({
                status: 'error',
                message: `Error al obtener estadísticas de scraping: ${error.message}`
            });
        }
    }

    async getFilterOptions(req: Request, res: Response) {
        try {
            const filterValues = await this._jobsService.getDistinctFilterValues();
            return res.json({
                status: 'success',
                data: filterValues,
            });
        } catch (error) {
            console.error('Error in getFilterOptions controller:', error);
            return res.status(500).json({
                status: 'error',
                message: error.message || 'Error retrieving filter options',
            });
        }
    }
}