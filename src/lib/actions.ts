// lib/ai-actions.ts
'use server';

import { getMutableAIState, streamUI } from 'ai/rsc';
import { ReactNode } from 'react';

export async function submitUserMessage(userInput: string): Promise<ReactNode> {
  const aiState = getMutableAIState();

  // Add user message to AI state
  aiState.update([
    ...aiState.get(),
    { role: 'user', content: userInput }
  ]);

  try {
    const response = await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...aiState.get(), { role: 'user', content: userInput }]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { content, error } = await response.json();

    if (error) throw new Error(error);

    // Add assistant response to AI state
    aiState.done([
      ...aiState.get(),
      { role: 'assistant', content }
    ]);

    return <div className="assistant-message">{content}</div>;
  } catch (error) {
    console.error('Error in submitUserMessage:', error);
    const errorMessage = 'Sorry, I encountered an error. Please try again.';

    aiState.done([
      ...aiState.get(),
      { role: 'assistant', content: errorMessage }
    ]);

    return <div className="error-message">{errorMessage}</div>;
  }
}
