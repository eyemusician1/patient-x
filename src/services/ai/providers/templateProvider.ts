import { InterviewModelProvider, ModelReplyRequest, ModelReplyResult } from '../types';

function pickPromptFromInput(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes('pain') || lower.includes('hurt')) {
    return 'Can you describe where the pain is, how intense it is from 0 to 10, and what makes it better or worse?';
  }

  if (lower.includes('fever') || lower.includes('temperature')) {
    return 'When did the fever begin, and have you noticed chills, cough, sore throat, or recent sick contacts?';
  }

  if (lower.includes('medicine') || lower.includes('medication')) {
    return 'Please list each medication, dose, and how often you take it so we can prepare an accurate summary for your doctor.';
  }

  return 'Thanks for sharing that. What started this problem, how has it changed over time, and what concerns you most right now?';
}

function buildStructuredFallback(input: string): string {
  const targeted = pickPromptFromInput(input);
  return `${targeted} Also tell me: when it started, what makes it better or worse, and any current medications or allergies.`;
}

export const templateProvider: InterviewModelProvider = {
  name: 'template',
  canRun: () => true,
  generateReply: async (request: ModelReplyRequest): Promise<ModelReplyResult> => {
    const firstNamePrefix = request.context?.firstName ? `${request.context.firstName}, ` : '';
    const prompt = buildStructuredFallback(request.userInput);

    return {
      source: 'template',
      text: `${firstNamePrefix}${prompt} If you have severe chest pain, trouble breathing, fainting, or heavy bleeding, seek urgent care now.`,
      modelUsed: 'template-symptom-guide',
    };
  },
};
