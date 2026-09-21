import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
}

function isPrivateIpv6(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

function isPrivateAddress(address: string) {
  return isIP(address) === 4
    ? isPrivateIpv4(address)
    : isIP(address) === 6
      ? isPrivateIpv6(address)
      : true;
}

export async function validatePublicUrl(value: string) {
  const url = new URL(value);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only HTTP and HTTPS URLs are supported.");
  }

  if (url.username || url.password) {
    throw new Error("Source URLs cannot contain credentials.");
  }

  if (
    url.hostname === "localhost" ||
    url.hostname.endsWith(".localhost") ||
    url.hostname.endsWith(".local")
  ) {
    throw new Error("Local network URLs are not allowed.");
  }

  if (url.port && !["80", "443"].includes(url.port)) {
    throw new Error("Only standard HTTP/HTTPS ports are allowed.");
  }

  const literal = isIP(url.hostname);
  const addresses = literal
    ? [{ address: url.hostname }]
    : await lookup(url.hostname, { all: true, verbatim: true });

  if (
    addresses.length === 0 ||
    addresses.some((entry) => isPrivateAddress(entry.address))
  ) {
    throw new Error("Private or local network URLs are not allowed.");
  }

  return url;
}

function htmlToText(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function fetchPublicSourceUrl(rawUrl: string) {
  let current = await validatePublicUrl(rawUrl);

  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      headers: {
        "User-Agent": "DanaAI-SourceIngestion/1.0",
        Accept: "text/html,text/plain,text/markdown;q=0.9,*/*;q=0.1",
      },
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Source URL redirect is missing a target.");
      current = await validatePublicUrl(new URL(location, current).toString());
      continue;
    }

    if (!response.ok) {
      throw new Error("Source URL returned HTTP " + response.status + ".");
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > 2 * 1024 * 1024) {
      throw new Error("Source URL content is too large.");
    }

    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > 2 * 1024 * 1024) {
      throw new Error("Source URL content is too large.");
    }

    const contentType = response.headers.get("content-type") ?? "";
    const titleMatch = raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

    return {
      finalUrl: current.toString(),
      title: titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || current.hostname,
      text: contentType.includes("html") ? htmlToText(raw) : raw,
    };
  }

  throw new Error("Source URL redirected too many times.");
}
