import auth from '@react-native-firebase/auth';
import { AI_CONFIG } from '../../../config/ai';
import { InterviewModelProvider, ModelReplyRequest, ModelReplyResult } from '../types';

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEndpointUrl(): string {
  const base = AI_CONFIG.backendBaseUrl.trim();
  const path = AI_CONFIG.backendInterviewPath.trim();

  if (!base) {
    return '';
  }

  if (!path) {
    return base;
  }

  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${normalizedBase}${normalizedPath}`;
}

export const backendProxyProvider: InterviewModelProvider = {
  name: 'backend-proxy',
  canRun: () => buildEndpointUrl().length > 0,
  generateReply: async (request: ModelReplyRequest): Promise<ModelReplyResult> => {
    const url = buildEndpointUrl();

    if (!url) {
      throw new Error('Backend AI endpoint is not configured');
    }

    const startedAt = Date.now();
    const maxAttempts = Math.max(1, (request.modelRouting?.maxRetries ?? 1) + 1);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (AI_CONFIG.includeAuthToken) {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), AI_CONFIG.requestTimeoutMs);

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal,
        });

        if (!response.ok) {
          const raw = await response.text();
          const status = response.status;
          const error = new Error(`Backend AI request failed (${status}): ${raw}`);

          if (attempt < maxAttempts - 1 && isRetryableStatus(status)) {
            await wait(300 * (attempt + 1));
            continue;
          }

          throw error;
        }

        const data = await response.json();
        const text = data?.text;

        if (typeof text !== 'string' || text.trim().length === 0) {
          throw new Error('Backend AI returned an empty response');
        }

        return {
          source: 'backend',
          text: text.trim(),
          modelUsed: typeof data?.model === 'string' ? data.model : request.modelRouting?.primary,
          latencyMs: Date.now() - startedAt,
        };
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxAttempts - 1) {
          await wait(300 * (attempt + 1));
          continue;
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError ?? new Error('Backend AI request failed');
  },
};
