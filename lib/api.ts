import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";

export type ErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "INTERNAL_ERROR";

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  415: "UNSUPPORTED_MEDIA_TYPE",
  500: "INTERNAL_ERROR",
};

/** Throw from services/handlers; the route wrapper turns it into a JSON response. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.code = fields ? "VALIDATION_ERROR" : (STATUS_TO_CODE[status] ?? "INTERNAL_ERROR");
    this.fields = fields;
  }
}

export const badRequest = (message: string) => new ApiError(400, message);
export const unauthorized = (message = "Please log in to continue.") => new ApiError(401, message);
export const forbidden = (message = "You do not have permission to do that.") => new ApiError(403, message);
export const notFound = (message = "Not found.") => new ApiError(404, message);
export const conflict = (message: string) => new ApiError(409, message);

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  status: number,
  code: ErrorCode,
  message: string,
  fields?: Record<string, string[]>,
): NextResponse {
  return NextResponse.json({ error: { code, message, ...(fields ? { fields } : {}) } }, { status });
}

function zodFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_form";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

/** Converts anything thrown in a handler into a safe JSON error. No stack traces leak. */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.code, error.message, error.fields);
  }
  if (error instanceof ZodError) {
    return errorResponse(400, "VALIDATION_ERROR", "Some fields are invalid.", zodFields(error));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return errorResponse(409, "CONFLICT", "That record already exists.");
    }
    if (error.code === "P2025") {
      return errorResponse(404, "NOT_FOUND", "Not found.");
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) {
    console.error("[api] database unavailable:", error.message);
    return errorResponse(500, "INTERNAL_ERROR", "The service is temporarily unavailable. Please try again.");
  }
  console.error("[api] unhandled error:", error);
  return errorResponse(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/**
 * Basic CSRF defence on top of SameSite=Lax cookies: if a browser sends an
 * Origin header on a state-changing request, it must match this app's host.
 * Tools like Postman and server-to-server calls send no Origin and pass.
 */
function assertSameOrigin(req: NextRequest): void {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw forbidden("Cross-site request blocked.");
  }
  if (!host || originHost !== host) {
    throw forbidden("Cross-site request blocked.");
  }
}

type RouteContext<P> = { params: Promise<P> };

/**
 * Wraps a route handler with origin checking and uniform error handling.
 *
 *   export const GET = route(async (req, { params }) => { ... });
 */
export function route<P extends Record<string, string> = Record<string, never>>(
  handler: (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (error) {
      return toErrorResponse(error);
    }
  };
}

/** Reads a JSON body; malformed JSON becomes a 400 instead of a 500. */
export async function readJson(req: NextRequest): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new ApiError(415, "Send the request body as JSON (Content-Type: application/json).");
  }
  try {
    return await req.json();
  } catch {
    throw badRequest("The request body is not valid JSON.");
  }
}

/** Query-string values as a plain object for Zod parsing. */
export function searchParamsObject(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
