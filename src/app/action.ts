// app/action.ts
'use server';

import { createAI, getAIState } from 'ai/rsc';
import { createDeepSeek } from '@ai-sdk/deepseek';

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY!
});

export const AI = createAI({
  actions: {
    submitUserMessage: async (userInput: string) => {
      'use server';

      const response = await generateText({
        model: deepseek('deepseek-chat'),
        messages: [
          ...getAIState().get().messages,
          { role: 'user', content: userInput }
        ]
      });

      return {
        id: Date.now(),
        role: 'assistant' as const,
        content: response.text
      };
    }
  },
  initialAIState: [],
  initialUIState: []
});
