import fs from "node:fs/promises";
import path from "node:path";

export type FortuneConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  temperature?: number;
  reasoningEffort?: "low" | "medium" | "high";
  headers?: Record<string, string>;
};

export function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.replace(/\/+$/, "");
  return trimmed.endsWith("/chat/completions") ? trimmed : `${trimmed}/chat/completions`;
}

export function normalizeFortuneConfig(config: FortuneConfig): FortuneConfig {
  if (!config.baseUrl || !config.apiKey || !config.model) {
    throw new Error("配置缺少 baseUrl、apiKey 或 model 字段。");
  }

  return {
    ...config,
    baseUrl: normalizeBaseUrl(config.baseUrl),
    reasoningEffort: config.reasoningEffort ?? "high",
  };
}

function parseHeadersEnv(raw?: string) {
  if (!raw?.trim()) {
    return undefined;
  }

  const parsed = JSON.parse(raw) as Record<string, string>;
  return Object.keys(parsed).length > 0 ? parsed : undefined;
}

function readFortuneConfigFromEnv(): FortuneConfig | null {
  const baseUrl = process.env.FORTUNE_BASE_URL?.trim();
  const apiKey = process.env.FORTUNE_API_KEY?.trim();
  const model = process.env.FORTUNE_MODEL?.trim();

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  const temperature = process.env.FORTUNE_TEMPERATURE?.trim();
  const reasoningEffort = process.env.FORTUNE_REASONING_EFFORT?.trim();

  return normalizeFortuneConfig({
    baseUrl,
    apiKey,
    model,
    temperature: temperature ? Number(temperature) : undefined,
    reasoningEffort:
      reasoningEffort === "low" || reasoningEffort === "medium" || reasoningEffort === "high"
        ? reasoningEffort
        : undefined,
    headers: parseHeadersEnv(process.env.FORTUNE_HEADERS_JSON),
  });
}

export async function readFortuneConfig(): Promise<FortuneConfig> {
  const envConfig = readFortuneConfigFromEnv();
  if (envConfig) {
    return envConfig;
  }

  try {
    const configPath = path.join(process.cwd(), "config", "fortune.config.json");
    const raw = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(raw) as FortuneConfig;
    return normalizeFortuneConfig(config);
  } catch (error) {
    if (process.env.VERCEL) {
      throw new Error(
        "未检测到私有推演配置。请在 Vercel 项目中设置 FORTUNE_BASE_URL、FORTUNE_API_KEY 与 FORTUNE_MODEL。",
      );
    }
    throw error;
  }
}
