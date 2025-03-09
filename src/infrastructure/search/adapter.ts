import { SearchEngineI } from "../../core/domain/ports/jobs.port";



export interface SearchAdapterI {

    searchEngine: SearchEngineI;
}