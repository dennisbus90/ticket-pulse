import type { AnalysisResult, AiProvider } from "@ticket-pulse/shared";

interface AnalyzeRequest {
  ticketText: string;
  provider: AiProvider;
  model: string;
  apiKey: string;
  projectContext?: string;
}

const DEFAULT_PROXY_URL = "https://zigge-analyze.azurewebsites.net";

let customProxyUrl = "";

export function setProxyUrl(url: string): void {
  customProxyUrl = url ? url.replace(/\/+$/, "") : "";
}

export function getProxyUrl(): string {
  return customProxyUrl || DEFAULT_PROXY_URL;
}

export async function analyzeViaProxy(
  request: AnalyzeRequest,
): Promise<AnalysisResult> {
  const url = customProxyUrl || DEFAULT_PROXY_URL;

  const res = await fetch(`${url}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Analysis failed: ${res.status} ${body}`);
  }

  return res.json();
}
