import { NextRequest } from "next/server";

import { getAdminSupabase } from "@/lib/supabase/admin";

export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const readJsonBody = async <T>(request: NextRequest): Promise<T> => {
  try {
    return (await request.json()) as T;
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
};

export const requireBearerToken = (request: NextRequest): string => {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing Bearer token.");
  }

  return authHeader.replace("Bearer ", "").trim();
};

export const requireAuthenticatedOperator = async (request: NextRequest): Promise<string> => {
  const token = requireBearerToken(request);
  const supabase = getAdminSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    throw new HttpError(401, "Invalid or expired auth token.");
  }

  return data.user.id;
};

export const mapApiError = (error: unknown): { status: number; message: string } => {
  if (error instanceof HttpError) {
    return { status: error.status, message: error.message };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }

  return { status: 500, message: "Unexpected server error." };
};
