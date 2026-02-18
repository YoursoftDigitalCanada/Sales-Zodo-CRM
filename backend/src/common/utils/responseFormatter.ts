import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  meta?: PaginationMeta;
  errors?: any[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function sendSuccess<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200,
  meta?: PaginationMeta
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
    meta,
  };
  
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(
  res: Response,
  data?: T,
  message: string = 'Created successfully'
): Response {
  return sendSuccess(res, data, message, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string
): Response {
  const totalPages = Math.ceil(total / limit);
  
  const meta: PaginationMeta = {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
  
  return sendSuccess(res, data, message, 200, meta);
}

export function sendError(
  res: Response,
  message: string,
  statusCode: number = 500,
  code?: string,
  errors?: any[]
): Response {
  const response: ApiResponse = {
    success: false,
    message,
    errors,
  };
  
  if (code) {
    (response as any).code = code;
  }
  
  return res.status(statusCode).json(response);
}