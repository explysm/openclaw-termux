import type { ModelDefinitionConfig } from "../config/types.js";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL_ID = "llama-3.3-70b-versatile";
export const GROQ_DEFAULT_MODEL_REF = `groq/${GROQ_DEFAULT_MODEL_ID}`;

// Groq pricing is usually very low/free tier exists. 
// Set to 0 as it varies and is often subsidized for speed benchmarks.
export const GROQ_DEFAULT_COST = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

/**
 * Static catalog of Groq models as fallback.
 */
export const GROQ_MODEL_CATALOG = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-70b-versatile",
    name: "Llama 3.1 70B Versatile",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3.1 8B Instant",
    reasoning: false,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B Instruct",
    reasoning: false,
    input: ["text"],
    contextWindow: 32768,
    maxTokens: 8192,
  },
  {
    id: "gemma2-9b-it",
    name: "Gemma 2 9B IT",
    reasoning: false,
    input: ["text"],
    contextWindow: 8192,
    maxTokens: 8192,
  },
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "DeepSeek R1 Distill Llama 70B",
    reasoning: true,
    input: ["text"],
    contextWindow: 128000,
    maxTokens: 8192,
  }
] as const;

export type GroqCatalogEntry = (typeof GROQ_MODEL_CATALOG)[number];

export function buildGroqModelDefinition(entry: GroqCatalogEntry): ModelDefinitionConfig {
  return {
    id: entry.id,
    name: entry.name,
    reasoning: entry.reasoning,
    input: [...entry.input],
    cost: GROQ_DEFAULT_COST,
    contextWindow: entry.contextWindow,
    maxTokens: entry.maxTokens,
  };
}

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  active: boolean;
  context_window: number;
}

interface GroqModelsResponse {
  data: GroqModel[];
}

/**
 * Discover models from Groq API.
 * Requires API key for the models endpoint.
 */
export async function discoverGroqModels(apiKey: string): Promise<ModelDefinitionConfig[]> {
  if (!apiKey) return GROQ_MODEL_CATALOG.map(buildGroqModelDefinition);

  try {
    const response = await fetch(`${GROQ_BASE_URL}/models`, {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return GROQ_MODEL_CATALOG.map(buildGroqModelDefinition);
    }

    const data = (await response.json()) as GroqModelsResponse;
    const catalogById = new Map<string, GroqCatalogEntry>(
      GROQ_MODEL_CATALOG.map((m) => [m.id, m]),
    );
    
    return data.data
      .filter(m => m.active !== false)
      .map(apiModel => {
        const catalogEntry = catalogById.get(apiModel.id);
        if (catalogEntry) return buildGroqModelDefinition(catalogEntry);
        
        const isReasoning = apiModel.id.toLowerCase().includes("r1") || 
                           apiModel.id.toLowerCase().includes("thinking");
                           
        return {
          id: apiModel.id,
          name: apiModel.id,
          reasoning: isReasoning,
          input: ["text"],
          cost: GROQ_DEFAULT_COST,
          contextWindow: apiModel.context_window || 128000,
          maxTokens: 8192,
        };
      });
  } catch {
    return GROQ_MODEL_CATALOG.map(buildGroqModelDefinition);
  }
}
