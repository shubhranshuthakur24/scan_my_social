import { NextRequest, NextResponse } from 'next/server';
import { getTrustedClientIp } from '@/lib/server/trustedClientIp';
import { forwardPublicWebPageSubmitServer } from '@/lib/api/publicWebPages.server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ username: string; slug: string; blockId: string }> }
) {
  const { username, slug, blockId } = await params;

  if (!username || !slug || !blockId) {
    return NextResponse.json({ success: false, message: 'Invalid submission request.' }, { status: 400 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const clientIp = getTrustedClientIp(request.headers);
  const result = await forwardPublicWebPageSubmitServer(username, slug, blockId, body, clientIp);

  return NextResponse.json(result, { status: result.success ? 200 : 422 });
}
