import { SearchEngineI } from "../../domain/ports/jobs.port";



export interface SearchAdapterI {

    searchEngine: SearchEngineI;
}