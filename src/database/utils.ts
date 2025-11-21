import { PAGINATION_CONSTANTS } from './constants';

export interface PaginationOptions {
  page?: number;
  limit?: number;
  search?: string;
}

export interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class DatabaseUtils {
  static validatePaginationParams(
    page?: number,
    limit?: number
  ): { page: number; limit: number } {
    const validPage = Math.max(
      PAGINATION_CONSTANTS.DEFAULT_PAGE,
      page || PAGINATION_CONSTANTS.DEFAULT_PAGE
    );
    const validLimit = Math.min(
      Math.max(1, limit || PAGINATION_CONSTANTS.DEFAULT_LIMIT),
      PAGINATION_CONSTANTS.MAX_LIMIT
    );

    return { page: validPage, limit: validLimit };
  }

  static calculateOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  static createPaginationResult<T>(
    data: T[],
    total: number,
    page: number,
    limit: number
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    };
  }

  static sanitizeSearchTerm(search?: string): string | undefined {
    if (!search || typeof search !== 'string') {
      return undefined;
    }

    return search.trim().toLowerCase();
  }

  static validateId(id: string): boolean {
    if (!id || typeof id !== 'string') {
      return false;
    }

    // UUID v4 validation
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
  }
}
