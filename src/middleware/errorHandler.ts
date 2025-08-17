import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { ErrorCodes, ErrorCode } from '../errors/types.js';
import { MongooseError } from 'mongoose';

interface ErrorResponse {
  error: {
    message: string;
    code: ErrorCode;
    statusCode: number;
    timestamp: string;
    path: string;
  };
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let code: ErrorCode = ErrorCodes.INTERNAL_ERROR;
  let message = 'Internal server error';

  // Error personalizado
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code || ErrorCodes.INTERNAL_ERROR;
    message = error.message;
  }
  else if (error.name === 'ValidationError') {
    statusCode = 400;
    code = ErrorCodes.VALIDATION_ERROR;
    message = 'Validation error';
  }
  else if (error.name === 'CastError') {
    statusCode = 400;
    code = ErrorCodes.INVALID_INPUT;
    message = 'Invalid input format';
  }
  else if ('code' in error && error instanceof MongooseError && error.code === 11000) {
    statusCode = 409;
    code = ErrorCodes.DUPLICATE_ENTRY;
    message = 'Duplicate entry';
  }

  console.error(`[ERROR] ${code}: ${message}`, {
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
    error: error.stack
  });

  const errorResponse: ErrorResponse = {
    error: {
      message,
      code,
      statusCode,
      timestamp: new Date().toISOString(),
      path: req.path
    }
  };

  res.status(statusCode).json(errorResponse);
};