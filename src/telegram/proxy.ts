import { ProxyAgent, fetch as undiciFetch } from "undici";
import { wrapFetchWithAbortSignal } from "../infra/fetch.js";

export function makeProxyFetch(proxyUrl: string): typeof fetch {
  const agent = new ProxyAgent(proxyUrl);
  return wrapFetchWithAbortSignal(((input: RequestInfo | URL, init?: RequestInit) => {
    const base = init ? { ...init } : {};
    // @ts-ignore - undici fetch supports dispatcher
    return undiciFetch(input, { ...base, dispatcher: agent }) as unknown as Promise<Response>;
  }) as typeof fetch);
}
