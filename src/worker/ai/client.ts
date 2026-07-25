export type AiEnv = {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
};

export type OpenAiConfig = {
  apiKey: string;
  model: string;
};

export function getOpenAiConfig(env: AiEnv): OpenAiConfig | null {
  if (!env.OPENAI_API_KEY) {
    return null;
  }

  return {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL ?? "gpt-4.1-mini",
  };
}
