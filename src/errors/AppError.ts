import { ErrorCode } from "./types.js";

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;
    public readonly code?: ErrorCode;
  
    constructor(
      message: string,
      statusCode: number = 500,
      code?: ErrorCode,
      isOperational: boolean = true
    ) {
      super(message);
      this.statusCode = statusCode;
      this.code = code;
      this.isOperational = isOperational;
  
      Error.captureStackTrace(this, this.constructor);
    }
  }