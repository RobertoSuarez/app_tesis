import { Browser } from "puppeteer";
import { MultitrabajosScrapingI } from "../../../core/domain/ports/jobs.port";
import { Jobs } from "../../../core/domain/entities/jobs.entity";
import OpenAI from "openai";
import { Platforms } from "../../../core/domain/entities/platforms.entity";
import { JobLikes } from "../../../core/domain/entities/jobLikes.entity";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

export class MultitrabajosScraping implements MultitrabajosScrapingI {

    constructor(
        private _browser: Browser,
        private _openai: OpenAI
    ) { }

    /**
     * Realiza una búsqueda en multitrabajos según el query dado
     * y devuelve un arreglo de links con las ofertas de empleo.
     */
    async searchJobs(query: string): Promise<string[]> {
        // Validación del query
        if (!query || !query.trim()) {
            throw new Error('La consulta no puede estar vacía.');
        }

        const page = await this._browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        const url = `https://www.multitrabajos.com/empleos-busqueda-${query.trim().replace(/\s+/g, '-')}.html`;
        let links: string[] | null = null;

        try {
            await page.goto(url, { waitUntil: 'networkidle0' });
            links = await page.evaluate(() => {
                const listado = document.querySelector('#listado-avisos');
                if (!listado) return null;  // No se encontró el contenedor esperado

                // Verificar si en el contenido se indica que no se encontraron avisos
                if (listado.innerHTML.includes('No encontramos')) {
                    return null;
                }

                const result: string[] = [];
                const lista = listado.children;
                for (let index = 0; index < lista.length; index++) {
                    const element = lista[index];
                    const anchor = element.querySelector('a');
                    if (anchor) {
                        const href = anchor.getAttribute('href');
                        if (href) result.push(href);
                    }
                }
                return result;
            });
        } catch (error) {
            console.error('Error al cargar la página o evaluar el DOM:', error);
            links = null;
        } finally {
            await page.close();
        }

        // Si no se obtuvieron links, retorna arreglo vacío
        if (!links) {
            return [];
        }

        // Filtra y normaliza los links
        links = links.slice(0, -1).slice(0, 10);
        links = links.map(link => `https://www.multitrabajos.com${link}`);
        links = links.filter(url => /https:\/\/www\.multitrabajos\.com\/empleos\/.+-\d+\.html/.test(url));

        return links;
    }

    /**
     * Obtiene la información principal de la oferta de empleo
     * desde la página y la asigna a la entidad Jobs.
     */
    async getJob(url: string): Promise<Jobs> {
        let job = new Jobs();

        const page = await this._browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });

        await page.goto(url, { waitUntil: 'networkidle0' });

        // Realiza el scraping
        const data = await page.evaluate(() => {
            try {
                const title = document.querySelector('#header-component h1')?.textContent?.trim() || '';
                const company = document.querySelector('#header-component div div span')?.textContent?.trim() || '';
                const location = document.querySelectorAll('#ficha-detalle h2')[1]?.textContent?.trim() || '';
                const workType = document.querySelectorAll('#ficha-detalle h2')[2]?.textContent?.trim() || '';
                const workScheduleType = document.querySelectorAll('#ficha-detalle h2')[4]?.textContent?.trim() || '';
                const description = document.querySelector('#ficha-detalle')?.textContent || '';
                const details = document.querySelector('#header-component')?.textContent || '';

                return {
                    title,
                    company,
                    location,
                    workType,
                    workScheduleType,
                    description,
                    details
                }
            } catch (error) {
                console.log(error);
                return {
                    title: '',
                    company: '',
                    location: '',
                    workType: '',
                    workScheduleType: '',
                    description: '',
                    details: ''
                }
            }
        });

        // Cerramos la página
        await page.close();

        // Asignamos la información base al objeto job
        job.title = data.title;
        job.Company = data.company;
        job.Location = data.location;
        job.workType = data.workType;
        job.workScheduleType = data.workScheduleType;
        job.description = data.description;
        job.URL = url;
        job.scrapedAt = new Date();

        // Asignamos la plataforma (dummy o real, según tu caso)
        const platform = new Platforms();
        platform.uid = '56f94243-74f1-4408-9ef5-ebb97bd615c1';
        job.platform = platform;

        // Completamos con información inferida por IA
        job = await this.completeJobWithAI(job, data.details);

        return job;
    }

    /**
     * Utiliza IA (OpenAI) para inferir o completar campos faltantes:
     * - area, position
     * - bonus, extraHours
     * - hasGrowthOpportunities, growthOpportunitiesDescription
     * - alignmentWithProfession
     * - companyReputation, costOfLivingIndex
     * - Además, se corrigen o establecen de forma óptima los valores de workType y workScheduleType.
     */
    async completeJobWithAI(job: Jobs, detailsExtras: string): Promise<Jobs> {
        // Schema Zod que representa todos los campos a inferir
        const datos = z.object({
            levelExperience: z.string(),
            description: z.string(),
            attitudes: z.array(z.string()),
            salaryRange: z.string(),
            disabilityInclusion: z.boolean(),
            company: z.string(),
            hasSalaryRange: z.boolean(),
            salaryMax: z.number(),
            salaryMin: z.number(),

            // Campos NUEVOS de la entidad Jobs
            area: z.string(),
            position: z.string(),
            bonus: z.number(),
            extraHours: z.number(),
            hasGrowthOpportunities: z.boolean(),
            growthOpportunitiesDescription: z.string(),
            alignmentWithProfession: z.string(),
            companyReputation: z.number(),
            costOfLivingIndex: z.number(),

            // Nuevos campos para establecer mejor los tipos de trabajo
            workType: z.string(),
            workScheduleType: z.string()
        });

        // Llamada a la API de OpenAI
        const completion = await this._openai.beta.chat.completions.parse({
            model: 'gpt-4o-mini', // Ajusta el modelo según tus necesidades
            messages: [
                {
                    role: 'system',
                    content: `
            Extrae e infiere la información de la oferta de empleo que se te proporcionará.
            Asegúrate de responder en español y formatea la descripción de manera clara y estructurada.
            Incluye el rango salarial si está disponible; si no, "hasSalaryRange" debe ser false.
            Además, infiere o corrige los siguientes campos:
              - area (sector del puesto),
              - position (nivel/rol, ej. 'Senior Developer'),
              - bonus (bonificación adicional),
              - extraHours (horas extra estimadas),
              - hasGrowthOpportunities (si hay planes de carrera),
              - growthOpportunitiesDescription (detalles de oportunidades de crecimiento),
              - alignmentWithProfession (grado de alineación con la profesión),
              - companyReputation (escala 0-10),
              - costOfLivingIndex (escala 0-10 o valor aproximado).
            Adicionalmente, revisa y establece de forma óptima los valores de:
              - workType (por ejemplo, 'Remote', 'OnSite' o 'Hybrid'),
              - workScheduleType (por ejemplo, 'FullTime', 'PartTime', 'Contract' o 'Internship').
            En caso de no disponer de datos, usa 0 para números, "" para cadenas y false para booleanos.
          `
                },
                {
                    role: 'user',
                    content: `
            Tengo la siguiente oferta de empleo:
            Título del puesto: ${job.title}
            Ubicación: ${job.Location}
            Tipo de trabajo inicial: ${job.workType}
            Tipo de horario inicial: ${job.workScheduleType}
            Descripción: ${job.description}
            Datos extras: ${detailsExtras}
          `
                },
            ],
            response_format: zodResponseFormat(datos, 'details')
        });

        // Parseamos la respuesta para obtener el objeto tipado
        const details = completion.choices[0].message.parsed;

        // Asignamos los valores al objeto job
        job.levelExperience = details.levelExperience;
        job.attitudes = details.attitudes;
        job.hasSalaryRange = details.hasSalaryRange;
        job.salaryMin = details.salaryMin;
        job.salaryMax = details.salaryMax;
        job.disabilityInclusion = details.disabilityInclusion;
        job.description = details.description;
        job.Company = details.company;

        // Campos nuevos para AHP/MCDA
        job.area = details.area;
        job.position = details.position;
        job.bonus = details.bonus;
        job.extraHours = details.extraHours;
        job.hasGrowthOpportunities = details.hasGrowthOpportunities;
        job.growthOpportunitiesDescription = details.growthOpportunitiesDescription;
        job.alignmentWithProfession = details.alignmentWithProfession;
        job.companyReputation = details.companyReputation;
        job.costOfLivingIndex = details.costOfLivingIndex;

        // Actualización de workType y workScheduleType con los valores inferidos por la IA
        job.workType = details.workType;
        job.workScheduleType = details.workScheduleType;

        return job;
    }
}
