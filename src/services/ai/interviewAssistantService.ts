import { backendProxyProvider } from './providers/backendProxyProvider';
import { templateProvider } from './providers/templateProvider';
import { ModelReplyRequest, ModelReplyResult, ModelRuntimeStatus } from './types';
import { AI_CONFIG } from '../../config/ai';

const providers = [backendProxyProvider, templateProvider];

function buildInterviewSystemPrompt(firstName?: string, profileContext?: string): string {
  const greetingName = firstName ? `The patient's first name is ${firstName}.` : 'The patient first name may be unknown.';
  const coreInstructions = [
    'You are a clinical interview assistant for visit preparation, not a doctor.',
    greetingName,
    'Collect history clearly: symptom, onset, duration, severity, triggers/relief, associated symptoms, meds, allergies, and red flags.',
    'Ask exactly one focused follow-up question in plain language.',
    'Do not diagnose and do not prescribe treatment.',
    'If red-flag symptoms appear, advise urgent in-person care clearly.',
    'Keep response concise: maximum 3 sentences.',
  ].join(' ');

  if (!profileContext || profileContext.trim().length === 0) {
    return coreInstructions;
  }

  return `${coreInstructions}\n\n${profileContext.trim()}`;
}

function isLowQualityReply(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 25) {
    return true;
  }

  const genericPatterns = [
    /as an ai/i,
    /i cannot provide medical advice/i,
    /^thanks for sharing\.?$/i,
  ];

  return genericPatterns.some((pattern) => pattern.test(trimmed));
}

export function getModelRuntimeStatus(): ModelRuntimeStatus {
  const cloudConfigured = AI_CONFIG.backendBaseUrl.trim().length > 0;

  return {
    cloudConfigured,
    cloudEnabled: cloudConfigured && backendProxyProvider.canRun(),
  };
}

export async function generateInterviewReply(request: ModelReplyRequest): Promise<ModelReplyResult> {
  const enrichedRequest: ModelReplyRequest = {
    ...request,
    modelRouting: request.modelRouting ?? AI_CONFIG.modelRouting,
    constraints: request.constraints ?? {
      maxSentences: 3,
      askOneQuestion: true,
      includeSafetyReminder: true,
    },
    systemPrompt: request.systemPrompt ?? buildInterviewSystemPrompt(request.context?.firstName, request.context?.profileContext),
  };

  for (const provider of providers) {
    if (!provider.canRun()) {
      continue;
    }

    try {
      const result = await provider.generateReply(enrichedRequest);

      if (result.source !== 'template' && isLowQualityReply(result.text)) {
        continue;
      }

      return result;
    } catch {
      // Fall through to the next provider.
    }
  }

  return templateProvider.generateReply(enrichedRequest);
}
