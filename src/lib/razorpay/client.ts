// NOTE: server-only module (uses RAZORPAY_KEY_SECRET). Import exclusively
// from server actions / route handlers — never from client components.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env for Razorpay.`);
  return value;
}

export function razorpayKeyId(): string {
  return required("RAZORPAY_KEY_ID");
}

function razorpayKeySecret(): string {
  return required("RAZORPAY_KEY_SECRET");
}

function authHeader(): string {
  return (
    "Basic " +
    Buffer.from(`${razorpayKeyId()}:${razorpayKeySecret()}`).toString("base64")
  );
}

export interface RazorpayFailure {
  ok: false;
  /** Razorpay error code, e.g. BAD_REQUEST_ERROR */
  code: string;
  message: string;
  /** true when the merchant account lacks Route access (dashboard action needed) */
  routeDisabled: boolean;
}

export type RazorpayResult<T> = { ok: true; data: T } | RazorpayFailure;

/** Minimal typed fetch wrapper over the Razorpay REST API (server-only). */
export async function rzpFetch<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
): Promise<RazorpayResult<T>> {
  let res: Response;
  try {
    res = await fetch(`https://api.razorpay.com${path}`, {
      method,
      headers: {
        Authorization: authHeader(),
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      code: "NETWORK_ERROR",
      message: err instanceof Error ? err.message : "Network request failed.",
      routeDisabled: false,
    };
  }

  const json = (await res.json().catch(() => null)) as {
    error?: { code?: string; description?: string };
  } | null;

  if (!res.ok || !json || (json as { error?: unknown }).error) {
    const err = (json as { error?: { code?: string; description?: string } })
      ?.error;
    const message = err?.description ?? `Razorpay request failed (${res.status}).`;
    return {
      ok: false,
      code: err?.code ?? `HTTP_${res.status}`,
      message,
      routeDisabled: message.toLowerCase().includes("route") &&
        (message.toLowerCase().includes("not enabled") ||
          message.toLowerCase().includes("private auth")),
    };
  }

  return { ok: true, data: json as T };
}
