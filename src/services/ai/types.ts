import { InterviewMessage } from '../../types/interview';

export interface InterviewReplyContext {
  firstName?: string;
  profileContext?: string;
}

export interface InterviewReplyConstraints {
  maxSentences: number;
  askOneQuestion: boolean;
  includeSafetyReminder: boolean;
}

export interface ModelRoutingPolicy {
  primary: string;
  fallback?: string;
  escalation?: string;
  maxRetries?: number;
}

export interface ModelReplyRequest {
  userInput: string;
  messageHistory: InterviewMessage[];
  context?: InterviewReplyContext;
  modelRouting?: ModelRoutingPolicy;
  systemPrompt?: string;
  constraints?: InterviewReplyConstraints;
}

export interface ModelReplyResult {
  text: string;
  source: 'backend' | 'template';
  modelUsed?: string;
  latencyMs?: number;
}

export interface ModelRuntimeStatus {
  cloudConfigured: boolean;
  cloudEnabled: boolean;
}

export interface InterviewModelProvider {
  readonly name: string;
  canRun: () => boolean;
  generateReply: (request: ModelReplyRequest) => Promise<ModelReplyResult>;
}
