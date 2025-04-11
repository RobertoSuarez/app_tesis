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
}



export class JobsController {
    constructor(
        private _jobsService: JobsService
    ) { }

    async getJobs(req: Request, res: Response) {
        const { user }: { user: User } = req['user'];
        // const search = req.query["search"] as string;

        const body = req.body as SearchMCDA;

        const jobs = await this._jobsService.getJobs(user.uid, body.search, body.weights);
        return res.json({
            status: 'success',
            length: jobs.length,
            jobs: jobs,
        });
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
}