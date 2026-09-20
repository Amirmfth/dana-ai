import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_ACCESS_COOKIE,
  AUTH_REFRESH_COOKIE,
  authCookieOptions,
  getSupabaseAuthConfig,
} from "@/lib/auth/config";

export type DanaAuthUser = {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
  user?: DanaAuthUser;
};

async function authFetch(path: string, init: RequestInit = {}) {
  const { url, publishableKey } = getSupabaseAuthConfig();

  return fetch(url + "/auth/v1" + path, {
    ...init,
    headers: {
      apikey: publishableKey,
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
}

async function parseAuthError(response: Response) {
  const payload = (await response.json().catch(() => null)) as
    | { msg?: string; message?: string; error_description?: string }
    | null;

  return (
    payload?.msg ??
    payload?.message ??
    payload?.error_description ??
    "Authentication request failed."
  );
}

async function writeSession(session: AuthSession) {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_ACCESS_COOKIE, session.access_token, {
    ...authCookieOptions,
    maxAge: session.expires_in ?? 3600,
  });

  cookieStore.set(AUTH_REFRESH_COOKIE, session.refresh_token, {
    ...authCookieOptions,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function signInWithPassword(email: string, password: string) {
  const response = await authFetch("/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  const session = (await response.json()) as AuthSession;
  await writeSession(session);
  return session.user ?? null;
}

export async function signUpWithPassword(email: string, password: string) {
  const response = await authFetch("/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await parseAuthError(response));
  }

  const payload = (await response.json()) as Partial<AuthSession> & {
    user?: DanaAuthUser;
  };

  if (payload.access_token && payload.refresh_token) {
    await writeSession(payload as AuthSession);
    return { signedIn: true, user: payload.user ?? null };
  }

  return { signedIn: false, user: payload.user ?? null };
}

export async function signOut() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;

  if (accessToken) {
    await authFetch("/logout", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    }).catch(() => null);
  }

  cookieStore.delete(AUTH_ACCESS_COOKIE);
  cookieStore.delete(AUTH_REFRESH_COOKIE);
}

export async function getCurrentUser(): Promise<DanaAuthUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(AUTH_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return null;
  }

  const response = await authFetch("/user", {
    headers: {
      Authorization: "Bearer " + accessToken,
    },
  });

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as DanaAuthUser;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
