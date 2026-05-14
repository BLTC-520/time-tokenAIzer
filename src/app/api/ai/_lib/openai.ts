import OpenAI from 'openai';

const DEFAULT_MODEL = 'gpt-5.5';

const extractJson = (content: string): string => {
  const trimmed = content.trim();

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Model response did not include a JSON object.');
  }

  return match[0];
};

export const getOpenAIClient = () => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
};

export const getOpenAIModel = () => process.env.OPENAI_MODEL || DEFAULT_MODEL;

export const completeJson = async (systemPrompt: string, userPrompt: string): Promise<string> => {
  const client = getOpenAIClient();

  if (!client) {
    throw new Error('OPENAI_API_KEY is not configured.');
  }

  const response = await client.responses.create({
    model: getOpenAIModel(),
    instructions: `${systemPrompt}\n\nReturn only a valid JSON object. Do not include markdown fences.`,
    input: userPrompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'json_object_response',
        schema: {
          type: 'object',
          additionalProperties: true,
        },
        strict: false,
      },
    },
  });

  const content = response.output_text;

  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  return extractJson(content);
};
