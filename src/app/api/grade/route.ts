import { NextResponse } from "next/server";

import { gradeReturn, type ReturnDraft } from "@/lib/reloop";

export async function POST(request: Request) {
  const draft = (await request.json()) as ReturnDraft;
  return NextResponse.json(gradeReturn(draft));
}
