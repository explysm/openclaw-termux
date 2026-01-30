import type { ModelDefinitionConfig } from "../config/types.js";

export const CEREBRAS_DEFAULT_MODEL_ID = "cerebras/cerebras-gpt-7b";
export const CEREBRAS_DEFAULT_MODEL_REF = `cerebras/${CEREBRAS_DEFAULT_MODEL_ID}`;

// Pricing: Cerebras doesn't publish public rates. Override in models.json for accurate costs.
const DEFAULT_CEREBRAS_MODEL_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

/**
 * Static catalog of Cerebras models as fallback.
 * https://huggingface.co/Cerebras
 */
export const CEREBRAS_MODEL_CATALOG: ModelDefinitionConfig[] = [
  {
    id: "cerebras-gpt-7b",
    name: "Cerebras GPT 7B",
    api: "cerebras-completions",
    provider: "cerebras",
    reasoning: true, // Assuming it has some reasoning capability
    input: ["text"],
    cost: DEFAULT_CEREBRAS_MODEL_COST,
    contextWindow: 4096, // Typical context window for 7B models
    maxTokens: 2048, // Typical max tokens for 7B models
  },
  // Add other Cerebras models here as needed
];

export type CerebrasCatalogEntry = (typeof CEREBRAS_MODEL_CATALOG)[number];

export function buildCerebrasModelDefinition(entry: CerebrasCatalogEntry): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    api: entry.api,
    provider: "cerebras",
    reasoning: entry.reasoning,
    input: entry.input,
    cost: entry.cost,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
    headers: entry.headers,
    compat: entry.compat,
  };
}

// TODO: Implement dynamic model discovery if Cerebras API supports a /models endpoint
// export async function discoverCerebrasModels(apiKey: string): Promise<ModelDefinitionConfig[]> {
//   if (!apiKey) return CEREBRAS_MODEL_CATALOG.map(buildCerebrasModelDefinition);
//   const headers = { Authorization: `Bearer ${apiKey}` };
//   const response = await fetch("https://api.cerebras.ai/v1/models", { headers });
//   if (!response.ok) {
//     console.warn(`[cerebras] Failed to discover models: HTTP ${response.status}, using static catalog`);
//     return CEREBRAS_MODEL_CATALOG.map(buildCerebrasModelDefinition);
//   }
//   const data = (await response.json()) as { data: Array<{ id: string; name: string; context_length?: number }> };
//   return data.data.map(model => ({
//     id: model.id,
//     name: model.name,
//     api: "cerebras-completions",
//     provider: "cerebras",
//     reasoning: true,
//     input: ["text"],
//     cost: DEFAULT_CEREBRAS_MODEL_COST,
//     contextWindow: model.context_length ?? 4096,
//     maxTokens: 2048,
//   }));
// }
