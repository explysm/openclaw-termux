import "@mariozechner/pi-coding-agent";

declare module "@mariozechner/pi-coding-agent" {
  interface CreateAgentSessionOptions {
    systemPrompt?: string;
    skills?: string[];
    contextFiles?: string[];
    additionalExtensionPaths?: string[];
    verboseLevel?: string;
    reasoningLevel?: string;
    toolResultFormat?: string;
  }
}
