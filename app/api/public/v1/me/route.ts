import { NextResponse } from 'next/server';
import { authPublicApi } from '@/lib/public-api/auth';
import { withRateLimit } from '@/app/api/public/v1/with-rate-limit';

export const runtime = 'nodejs';

export const GET = withRateLimit(async function GET(request: Request) {
  const auth = await authPublicApi(request);
  if (!auth.ok) {
    return NextResponse.json(auth.body, { status: auth.status });
  }

  return NextResponse.json({
    data: {
      organization_id: auth.organizationId,
      organization_name: auth.organizationName,
      api_key_prefix: auth.apiKeyPrefix,
    },
  });
});

