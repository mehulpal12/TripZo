export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly metadata?: Record<string, any>;

  constructor(code: string, statusCode: number, message: string, metadata?: Record<string, any>) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.metadata = metadata;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}
