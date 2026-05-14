export class AiClient {
  async postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `AI request failed with ${response.status}`);
    }

    return response.json() as Promise<TResponse>;
  }

  portfolio<TResponse>(body: unknown) {
    return this.postJson<TResponse>('/api/ai/portfolio', body);
  }

  tokenization<TResponse>(body: unknown) {
    return this.postJson<TResponse>('/api/ai/tokenization', body);
  }

  assistant<TResponse>(body: unknown) {
    return this.postJson<TResponse>('/api/ai/assistant', body);
  }
}

export const aiClient = new AiClient();
