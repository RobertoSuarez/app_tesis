import { Search } from "../models/search.entity";


export interface SearchRepositoryI {
    lastSearch(limit: number): Promise<Search[]>;
    // sought actualiza el estado del termino de búsqueda.
    // para saber si ya ha sido utilizado para hacer scraping.
    sought(uid: string): Promise<void>;
}