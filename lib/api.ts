import { NextResponse } from "next/server";

export function jsonError(
  message: string,
  status = 400,
  code?: string
): NextResponse {
  return NextResponse.json({ error: message, code }, { status });
}
