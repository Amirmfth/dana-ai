import { NextResponse, type NextRequest } from "next/server";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  getSupabaseAuthConfig,
} from "@/lib/auth/config";

export async function refreshAuthSession(request: NextRequest) {
  const accessToken = request.cookies.get(AUTH_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(AUTH_REFRESH_COOKIE)?.value;

  if (!accessToken || !refreshToken) {
    return NextResponse.next({ request });
  }

  const { url, publishableKey } = getSupabaseAuthConfig();

  const userResponse = await fetch(url + "/auth/v1/user", {
    headers: {
      apikey: publishableKey,
      Authorization: "Bearer " + accessToken,
    },
    cache: "no-store",
  });

  if (userResponse.ok) {
    return NextResponse.next({ request });
  }

  const refreshResponse = await fetch(
    url + "/auth/v1/token?grant_type=refresh_token",
    {
      method: "POST",
      headers: {
        apikey: publishableKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    },
  );

  const response = NextResponse.next({ request });

  if (!refreshResponse.ok) {
    response.cookies.delete(AUTH_ACCESS_COOKIE);
    response.cookies.delete(AUTH_REFRESH_COOKIE);
    return response;
  }

  const session = (await refreshResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in?: number;
  };

  response.cookies.set(AUTH_ACCESS_COOKIE, session.access_token, {
    ...authCookieOptions,
    maxAge: session.expires_in ?? 3600,
  });
  response.cookies.set(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...authCookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
