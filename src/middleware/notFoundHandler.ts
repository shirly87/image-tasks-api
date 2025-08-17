import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes } from '../errors/types.js';

export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
    throw new AppError(
        `Route ${req.method} ${req.path} not found`,
        404,
        ErrorCodes.NOT_FOUND
    );
};
