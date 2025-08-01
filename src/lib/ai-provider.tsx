'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

// Define the shape of a chat message
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Add _metadata to the message interface to store extra data like chartImage
  _metadata?: {
    type?: string;
    chartImage?: string;
    title_suggestion?: string;
    graphError?: boolean;
    errorMessage?: string;
    noData?: boolean;
    noResults?: boolean;
    searchedKeywords?: string[];
    selectedInfluencer?: string;
    keywordCoverage?: string[];
    intersectionScore?: number;
    allKeywords?: string[];
    topInfluencers?: Array<{ username: string; keywords: string[]; score: number }>;
    influencerId?: string;
    responseType?: string;
  };
  charts?: string[]; // Keep this for backward compatibility if needed, though _metadata.chartImage is preferred
}

// Define the shape of the AI context
interface AIContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  submitMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
}

// Create the AI context
const AIContext = createContext<AIContextType | undefined>(undefined);

// AI Provider component
export function AIProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const submitMessage = useCallback(async (userMessage: string) => {
    setIsLoading(true);

    // Add user message to state immediately
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(), // Simple unique ID
      role: 'user',
      content: userMessage,
    };
    setMessages((prevMessages) => [...prevMessages, newUserMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, newUserMessage] }), // Send all messages
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        setMessages((prevMessages) => [
          ...prevMessages,
          {
            id: Date.now().toString() + '-error',
            role: 'assistant',
            content: `Error: ${errorData.error || 'Something went wrong.'} ${errorData.details || ''}`,
          },
        ]);
        return;
      }

      const data = await response.json();
      console.log("API Response Data:", data); // Log the full API response

      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: data.content,
        _metadata: data._metadata, // --- THIS IS THE CRUCIAL CHANGE ---
      };

      setMessages((prevMessages) => [...prevMessages, assistantMessage]);

    } catch (error) {
      console.error('Failed to submit message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now().toString() + '-network-error',
          role: 'assistant',
          content: 'Network error or unable to connect to AI. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [messages]); // messages is a dependency to send the full chat history

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <AIContext.Provider value={{ messages, isLoading, submitMessage, clearMessages }}>
      {children}
    </AIContext.Provider>
  );
}

// Custom hook to use the AI context
export function useAI() {
  const context = useContext(AIContext);
  if (context === undefined) {
    throw new Error('useAI must be used within an AIProvider');
  }
  return context;
}
