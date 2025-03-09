import OpenAI from "openai";
import { z } from "zod";
import { zodResponseFormat } from "openai/helpers/zod";
import { Browser, Page } from "puppeteer";
import { Jobs } from "../../../core/domain/entities/jobs.entity";
import { CompuTrabajoScrapingI } from "../../../core/domain/ports/jobs.port";
import { Platforms } from "../../../core/domain/entities/platforms.entity";

export class CompuTrabajoScraping implements CompuTrabajoScrapingI {

    constructor(
        private _browser: Browser,
        private _openai: OpenAI
    ) { }

    /**
     * Obtiene las URLs de las ofertas de empleo en CompuTrabajo según el término de búsqueda.
     */
    async getURLs(search: string): Promise<string[]> {
        let page: Page = null;
        try {
            page = await this._browser.newPage();
            const url = `https://ec.computrabajo.com/trabajo-de-${search.replace(/\s+/g, '-')}`;
            await page.goto(url, { waitUntil: 'networkidle0' });

            const data = await page.evaluate(() => {
                const urls: string[] = [];
                // Se recuperan todos los enlaces de las ofertas de empleo
                const listaOfertas = document.querySelectorAll('#offersGridOfferContainer a.js-o-link') as NodeListOf<HTMLAnchorElement>;
                listaOfertas.forEach((el) => {
                    if (el.href) urls.push(el.href);
                });
                return urls;
            });
            return data as string[];
        } catch (err) {
            console.error(err);
            return [];
        } finally {
            if (page) await page.close();
        }
    }

    /**
     * Realiza el scraping de la oferta y asigna la información básica a la entidad Jobs.
     */
    async getJob(url: string): Promise<Jobs> {
        let job = new Jobs();
        let page: Page = null;

        try {
            page = await this._browser.newPage();
            await page.setViewport({ width: 1920, height: 1080 });
            await page.goto(url, { waitUntil: 'networkidle0' });

            const data = await page.evaluate(() => {
                try {
                    const title = document.querySelector('.box_detail')?.textContent?.trim() || '';
                    const company = document.querySelector('.box_detail a')?.textContent?.trim() || '';
                    const location = document.querySelector('.detail_fs .container p')?.textContent?.trim() || '';
                    const description = document.querySelector('.box_detail [div-link="oferta"]')?.textContent?.trim() || '';
                    const tags = document.querySelectorAll('.tag.base.mb10');
                    const workType = tags[1]?.textContent?.trim() || '';
                    const workScheduleType = tags[2]?.textContent?.trim() || '';

                    return {
                        title,
                        company,
                        location,
                        workType,
                        workScheduleType,
                        description
                    };
                } catch (error) {
                    console.error(error);
                    return null;
                }
            });

            if (!data) throw new Error("No se pudo extraer la información básica de la oferta.");

            // Asignación de los campos básicos
            job.title = data.title;
            job.Company = data.company;
            job.Location = data.location;
            job.workType = data.workType;
            job.workScheduleType = data.workScheduleType;
            job.description = data.description;
            job.URL = url;
            job.scrapedAt = new Date();

            // Asignamos la plataforma (identificador propio de CompuTrabajo)
            const platform = new Platforms();
            platform.uid = '29fca5d9-2fc2-4baa-bfb2-28a67efd0a17';
            job.platform = platform;

            // Completa la oferta con información inferida por IA (incluye nuevos campos y estandarización de workType y workScheduleType)
            job = await this.completeJobWithAI(job);

        } catch (error) {
            console.error(error);
            throw error;
        } finally {
            if (page) await page.close();
        }
        return job;
    }

    /**
     * Utiliza IA para completar e inferir información faltante, incluyendo
     * los campos nuevos para el análisis AHP/MCDA y la estandarización de workType y workScheduleType.
     */
    async completeJobWithAI(job: Jobs): Promise<Jobs> {
        const datos = z.object({
            levelExperience: z.string(),
            description: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
            location: z.string(),
            company: z.string(),
            hasSalaryRange: z.boolean(),
            salaryMax: z.number(),
            salaryMin: z.number(),
            // Campos adicionales
            area: z.string(),
            position: z.string(),
            bonus: z.number(),
            extraHours: z.number(),
            hasGrowthOpportunities: z.boolean(),
            growthOpportunitiesDescription: z.string(),
            alignmentWithProfession: z.string(),
            companyReputation: z.number(),
            costOfLivingIndex: z.number(),
            // Campos para estandarizar
            workType: z.string(),
            workScheduleType: z.string()
        });

        const completion = await this._openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini-2024-07-18', // Ajusta el modelo si es necesario
            messages: [
                {
                    role: 'system',
                    content: `
            Extrae e infiere la información de la oferta de empleo a partir de los siguientes datos.
            Responde en español y formatea la descripción de manera clara.
            Si algún dato no se encuentra, utiliza valores por defecto: 0 para números, "" para cadenas y false para booleanos.
            Además, extrae o infiere los siguientes campos:
              - area: sector o área del puesto.
              - position: nivel o rol específico (ej. "Senior Developer").
              - bonus: bonificación adicional.
              - extraHours: horas extra estimadas.
              - hasGrowthOpportunities: si existen oportunidades de crecimiento.
              - growthOpportunitiesDescription: detalles sobre dichas oportunidades.
              - alignmentWithProfession: grado de alineación con la profesión.
              - companyReputation: reputación de la empresa en una escala (por ejemplo, 0-10).
              - costOfLivingIndex: índice del costo de vida asociado a la ubicación.
            Adicionalmente, revisa y establece de forma óptima los siguientes campos:
              - workType: que indique de manera estándar si el trabajo es 'Remote', 'OnSite' o 'Hybrid'.
              - workScheduleType: que especifique si es 'FullTime', 'PartTime', 'Contract' o 'Internship'.
          `
                },
                {
                    role: 'user',
                    content: `
            Oferta de empleo:
            Título: ${job.title}
            Empresa: ${job.Company}
            Ubicación: ${job.Location}
            Tipo de trabajo inicial: ${job.workType}
            Horario inicial: ${job.workScheduleType}
            Descripción: ${job.description}
          `
                },
            ],
            response_format: zodResponseFormat(datos, 'details')
        });

        const details = completion.choices[0].message.parsed;

        // Asignación de los campos inferidos
        job.levelExperience = details.levelExperience;
        job.description = details.description;
        job.attitudes = details.attitudes;
        job.salaryMin = details.salaryMin;
        job.salaryMax = details.salaryMax;
        job.hasSalaryRange = details.hasSalaryRange;
        job.disabilityInclusion = details.disabilityInclusion;
        job.Location = details.location;
        job.Company = details.company;

        // Campos adicionales para el análisis AHP/MCDA
        job.area = details.area;
        job.position = details.position;
        job.bonus = details.bonus;
        job.extraHours = details.extraHours;
        job.hasGrowthOpportunities = details.hasGrowthOpportunities;
        job.growthOpportunitiesDescription = details.growthOpportunitiesDescription;
        job.alignmentWithProfession = details.alignmentWithProfession;
        job.companyReputation = details.companyReputation;
        job.costOfLivingIndex = details.costOfLivingIndex;

        // Estandarización de workType y workScheduleType según lo inferido por la IA
        job.workType = details.workType;
        job.workScheduleType = details.workScheduleType;

        return job;
    }
}
