import {NextRequest, NextResponse} from 'next/server';
import {SESSION_COOKIE} from '@/lib/sso-helpers';
import {readSessionToken} from '@/lib/session';

export async function GET(request: NextRequest) {
  const session = await readSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }

  const {id, username, email, fullname, role, siteId} = session;
  return NextResponse.json({
    user: {id, username, email, fullname, name: fullname || username, role, siteId},
  });
}
