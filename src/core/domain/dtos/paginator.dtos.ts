

export interface PaginationQueryDto {
    search: string;
    page: number;
    size: number;
}

export interface PaginationResponseDto<T> {
    totalRecords?: number;
    totalPages?: number;
    page?: number;
    size?: number;
    data?: T[];
}

export const calculateTotalPage = (p: PaginationResponseDto<any>) => {
    if (p.size == 0) {
        return;
    }
    p.totalPages = Math.ceil(p.totalRecords / p.size);
}