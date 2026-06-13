export class ApiError extends Error {
  status: number;
  code: string;
  details?: { errors?: string[] } & Record<string, unknown>;
  traceId?: string;

  constructor(args: {
    status: number;
    code: string;
    message: string;
    details?: ApiError['details'];
    traceId?: string;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.details = args.details;
    this.traceId = args.traceId;
  }

  /** Per-field validation messages from the envelope, if any. */
  get fieldErrors(): string[] {
    return this.details?.errors ?? [];
  }
}
