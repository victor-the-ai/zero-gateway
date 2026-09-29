export function extractResetWindow(
  headers: Headers | Record<string, string | null | undefined>,
  body?: any,
  defaultCooldown: number = 60.0
): number {
  const getHeader = (name: string): string | null => {
    if (!headers) return null;
    if (typeof (headers as Headers).get === "function") {
      return (headers as Headers).get(name);
    }
    return (headers as Record<string, string>)[name] || (headers as Record<string, string>)[name.toLowerCase()] || null;
  };

  // 1. Retry-After header
  const retryAfter = getHeader("retry-after");
  if (retryAfter) {
    const val = parseFloat(retryAfter);
    if (!isNaN(val) && val > 0) {
      return val;
    }
  }

  // 2. X-RateLimit-Reset headers
  for (const h of ["x-ratelimit-reset", "x-ratelimit-reset-requests", "x-ratelimit-reset-tokens"]) {
    const rVal = getHeader(h);
    if (rVal) {
      const val = parseFloat(rVal);
      if (!isNaN(val)) {
        if (val > 1_000_000_000) {
          const remaining = Math.max(1.0, (val * 1000 - Date.now()) / 1000);
          return remaining;
        } else if (val > 0) {
          return val;
        }
      }
    }
  }

  // 3. Provider error body (e.g. Google Gemini retryDelay or details)
  if (body && typeof body === "object") {
    const error = body.error;
    if (error && typeof error === "object") {
      const details = error.details;
      if (Array.isArray(details)) {
        for (const d of details) {
          if (d && typeof d === "object" && typeof d.retryDelay === "string") {
            const delayStr = d.retryDelay.replace(/s$/i, "");
            const val = parseFloat(delayStr);
            if (!isNaN(val) && val > 0) {
              return val;
            }
          }
        }
      }
      if (typeof error.retry_after === "number" || typeof error.retry_after === "string") {
        const val = parseFloat(String(error.retry_after));
        if (!isNaN(val) && val > 0) {
          return val;
        }
      }
      const msg = String(error.message || "");
      const match = msg.match(/retry after\s+([0-9.]+)\s*s?/i);
      if (match && match[1]) {
        const val = parseFloat(match[1]);
        if (!isNaN(val) && val > 0) {
          return val;
        }
      }
    }
  }

  return defaultCooldown;
}
