import {
  analyzeTextConfiguration,
  analyzeTextConfigurationFromIntent,
} from "../../features/text-configuration/engine/textConfigurationEngine";
import type { TextConfigAnalysis } from "../../features/text-configuration/types";
import { getOpenAiConfig } from "./client";
import type { AiEnv, OpenAiConfig } from "./client";
import { textConfigurationSystemPrompt, textConfigurationUserPrompt } from "./prompts";
import { parseTextConfigurationIntent, textConfigurationIntentJsonSchema } from "./schemas";

export async function analyzeTextConfigurationWithAi(input: string, env: AiEnv): Promise<TextConfigAnalysis> {
  const config = getOpenAiConfig(env);

  if (!config) {
    return deterministicFallback(input, "OPENAI_API_KEY is not configured.");
  }

  try {
    const intent = await requestTextConfigurationIntent(input, config);
    return analyzeTextConfigurationFromIntent(input, intent, {
      extractionModel: config.model,
      extractionSource: "llm",
      fallbackReason: null,
    });
  } catch (error) {
    return deterministicFallback(
      input,
      error instanceof Error ? `OpenAI extraction failed: ${error.message}` : "OpenAI extraction failed.",
      config.model,
    );
  }
}

async function requestTextConfigurationIntent(input: string, config: OpenAiConfig) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: textConfigurationSystemPrompt(),
        },
        {
          role: "user",
          content: textConfigurationUserPrompt(input),
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "text_configuration_intent",
          strict: true,
          schema: textConfigurationIntentJsonSchema,
        },
      },
    }),
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("empty structured intent");
  }

  return parseTextConfigurationIntent(JSON.parse(content));
}

function deterministicFallback(input: string, fallbackReason: string, model: string | null = null): TextConfigAnalysis {
  return {
    ...analyzeTextConfiguration(input),
    extractionModel: model,
    extractionSource: "deterministic",
    fallbackReason,
  };
}
