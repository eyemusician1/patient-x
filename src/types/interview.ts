export type InterviewRole = 'assistant' | 'user';

export interface InterviewMessage {
  id: string;
  role: InterviewRole;
  text: string;
  createdAt: number;
}

export interface InterviewSession {
  sessionId: string;
  messages: InterviewMessage[];
  createdAt: number;
  updatedAt: number;
}

export const INITIAL_INTERVIEW_PROMPT =
  "Hello. I'm here to help you prepare for your clinic visit. Let's start simple: what is the main reason you are seeing the doctor today?";
