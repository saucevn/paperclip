export class HttpError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown, code?: string) {
    super(message);
    this.status = status;
    this.details = details;
    this.code = code ?? HttpError.defaultCode(status);
  }

  static defaultCode(status: number): string {
    switch (status) {
      case 400: return "BAD_REQUEST";
      case 401: return "UNAUTHORIZED";
      case 403: return "FORBIDDEN";
      case 404: return "NOT_FOUND";
      case 409: return "CONFLICT";
      case 422: return "UNPROCESSABLE";
      default:  return status >= 500 ? "INTERNAL_SERVER_ERROR" : "REQUEST_FAILED";
    }
  }
}

export function badRequest(message: string, details?: unknown, code?: string) {
  return new HttpError(400, message, details, code);
}

export function unauthorized(message = "Unauthorized", code?: string) {
  return new HttpError(401, message, undefined, code);
}

export function forbidden(message = "Forbidden", code?: string) {
  return new HttpError(403, message, undefined, code);
}

export function notFound(message = "Not found", code?: string) {
  return new HttpError(404, message, undefined, code);
}

export function conflict(message: string, details?: unknown, code?: string) {
  return new HttpError(409, message, details, code);
}

export function unprocessable(message: string, details?: unknown, code?: string) {
  return new HttpError(422, message, details, code);
}
