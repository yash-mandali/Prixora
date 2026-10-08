export class AppError extends Error {
  constructor(httpStatus, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.details = details;
  }
  static badRequest(msg, code = 'BAD_REQUEST', d) { return new AppError(400, code, msg, d); }
  static unauthorized(msg = 'Authentication required', code = 'UNAUTHORIZED') { return new AppError(401, code, msg); }
  static forbidden(msg = 'Forbidden', code = 'FORBIDDEN') { return new AppError(403, code, msg); }
  static notFound(msg = 'Resource not found', code = 'NOT_FOUND') { return new AppError(404, code, msg); }
  static conflict(msg, code = 'CONFLICT') { return new AppError(409, code, msg); }
  static unprocessable(msg, code = 'UNPROCESSABLE', d) { return new AppError(422, code, msg, d); }
}
