import "server-only";
import { AdvisorError, record } from "./contracts";

const hints = ["authentication", "rate_limit", "upstream", "safety_filter", "token_budget", "structured_output", "invalid_response", "network", "unknown"] as const;
export type ProviderFailureHint = typeof hints[number];

/** Server diagnostics contain only a status and a fixed label, never upstream text. */
export class AdvisorProviderFailure extends AdvisorError {
  readonly providerStatus?: number;
  readonly providerHint: ProviderFailureHint;
  constructor(status?: number, hint: ProviderFailureHint = "unknown") {
    super("provider_failed");
    if (Number.isInteger(status) && status! >= 400 && status! <= 599) this.providerStatus = status;
    this.providerHint = hints.includes(hint) ? hint : "unknown";
  }
}

function hintFor(status: number, body?: unknown): ProviderFailureHint {
  if (status === 401 || status === 403) return "authentication";
  if (status === 429) return "rate_limit";
  if (status >= 500) return "upstream";
  const error = record(body) && record(body.error) ? body.error : body;
  if (!record(error)) return "unknown";
  const text = [error.code, error.type, error.message]
    .filter((v): v is string => typeof v === "string" && v.length <= 1024).join(" ");
  if (/content_filter|content policy|safety filter|moderation|jailbreak|prompt injection/i.test(text)) return "safety_filter";
  if (/token.{0,40}(budget|limit|exceed)|max_(?:completion_|output_)?tokens/i.test(text)) return "token_budget";
  if (/response_format|invalid.{0,30}json|json.{0,30}(invalid|parse|malformed)/i.test(text)) return "structured_output";
  return "unknown";
}

/** Diagnostic reads have a smaller independent time/size budget than inference. */
export async function rejectedProviderResponse(response: Response, signal: AbortSignal): Promise<AdvisorProviderFailure> {
  let body: unknown;
  const reader = response.body?.getReader();
  if (reader) {
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(250)]);
    let abort = () => {};
    try {
      const read = async () => {
        const chunks: Uint8Array[] = [];
        let bytes = 0;
        for (let n = 0; n < 32; n++) {
          const chunk = await reader.read();
          if (chunk.done) return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))) as unknown;
          bytes += chunk.value.byteLength;
          if (bytes > 4096) return undefined;
          chunks.push(chunk.value);
        }
        return undefined;
      };
      body = await Promise.race([read(), new Promise<never>((_, reject) => {
        abort = () => reject(new Error("diagnostic_deadline"));
        deadline.addEventListener("abort", abort, { once: true });
        if (deadline.aborted) abort();
      })]);
    } catch {
      if (signal.aborted) throw new AdvisorError("cancelled");
    } finally {
      deadline.removeEventListener("abort", abort);
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
  return new AdvisorProviderFailure(response.status, hintFor(response.status, body));
}

export function logProviderFailure(error: unknown) {
  if (!(error instanceof AdvisorProviderFailure)) return;
  // Keep the logging boundary independent of mutable/untrusted error properties.
  const safe = new AdvisorProviderFailure(error.providerStatus, error.providerHint);
  console.warn("owner_advisor_provider_failure", { code: safe.code, providerStatus: safe.providerStatus, providerHint: safe.providerHint });
}
