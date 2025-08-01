'use client';

import { useState, useEffect, useRef } from 'react';
import { useAI } from '@/lib/ai-provider';
// Removed next/link as it's not supported in this environment
import BarChart from '../../components/BarChart'; // Import the BarChart component

// Simple markdown renderer for chat messages
function MessageContent({ content }: { content: string }) {
  // Convert markdown to JSX
  const renderMarkdown = (text: string) => {
    // Split by newlines to handle different elements
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        elements.push(<h1 key={index} className="text-xl font-bold mb-2 mt-4">{line.slice(2)}</h1>);
      } else if (line.startsWith('## ')) {
        elements.push(<h2 key={index} className="text-lg font-bold mb-2 mt-3">{line.slice(3)}</h2>);
      } else if (line.startsWith('### ')) {
        elements.push(<h3 key={index} className="text-base font-bold mb-1 mt-2">{line.slice(4)}</h3>);
      }
      // Bullet points
      else if (line.startsWith('- ') || line.startsWith('* ')) {
        elements.push(
          <div key={index} className="flex items-start mb-1">
            <span className="text-blue-400 mr-2">•</span>
            <span>{formatInlineMarkdown(line.slice(2))}</span>
          </div>
        );
      }
      // Numbered lists
      else if (/^\d+\.\s/.test(line)) {
        const match = line.match(/^(\d+)\.\s(.+)/);
        if (match) {
          elements.push(
            <div key={index} className="flex items-start mb-1">
              <span className="text-blue-400 mr-2 font-medium">{match[1]}.</span>
              <span>{formatInlineMarkdown(match[2])}</span>
            </div>
          );
        }
      }
      // Empty lines
      else if (line.trim() === '') {
        elements.push(<br key={index} />);
      }
      // Regular paragraphs
      else if (line.trim()) {
        elements.push(<p key={index} className="mb-2">{formatInlineMarkdown(line)}</p>);
      }
    });

    return elements;
  };

  // Handle inline formatting like **bold** and *italic*
  const formatInlineMarkdown = (text: string) => {
    const parts = [];
    let currentText = text;
    let key = 0;

    // Handle **bold**
    currentText = currentText.replace(/\*\*(.*?)\*\*/g, (match, content) => {
      return `<BOLD_${key++}>${content}</BOLD_${key - 1}>`;
    });

    // Handle *italic*
    currentText = currentText.replace(/\*(.*?)\*/g, (match, content) => {
      return `<ITALIC_${key++}>${content}</ITALIC_${key - 1}>`;
    });

    // Handle `code`
    currentText = currentText.replace(/`(.*?)`/g, (match, content) => {
      return `<CODE_${key++}>${content}</CODE_${key - 1}>`;
    });

    // Split and render
    const segments = currentText.split(/(<BOLD_\d+>.*?<\/BOLD_\d+>|<ITALIC_\d+>.*?<\/ITALIC_\d+>|<CODE_\d+>.*?<\/CODE_\d+>)/);

    return segments.map((segment, index) => {
      if (segment.startsWith('<BOLD_')) {
        const content = segment.replace(/<BOLD_\d+>(.*?)<\/BOLD_\d+>/, '$1');
        return <strong key={index} className="font-bold">{content}</strong>;
      } else if (segment.startsWith('<ITALIC_')) {
        const content = segment.replace(/<ITALIC_\d+>(.*?)<\/ITALIC_\d+>/, '$1');
        return <em key={index} className="italic">{content}</em>;
      } else if (segment.startsWith('<CODE_')) {
        const content = segment.replace(/<CODE_\d+>(.*?)<\/CODE_\d+>/, '$1');
        return <code key={index} className="bg-gray-700 px-1 py-0.5 rounded text-sm font-mono">{content}</code>;
      }
      return segment;
    });
  };

  return <div>{renderMarkdown(content)}</div>;
}

export default function ChatPage() {
  const [input, setInput] = useState('');
  const { messages, submitMessage, isLoading, clearMessages } = useAI();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when not loading
  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput(''); // Clear input immediately for better UX

    try {
      await submitMessage(userInput);
    } catch (error) {
      // If submission fails, restore the input
      setInput(userInput);
      console.error('Failed to submit message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Assistant</h1>
          <a // Changed Link to a standard <a> tag
            href="/"
            className="text-purple-400 hover:text-purple-300 transition-colors"
          >
            ← Back to Influencers
          </a>
        </div>
      </div>

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6" role="log" aria-live="polite">
          {messages.length > 0 ? (
            <>
              {messages.map(message => {
                // --- ADD THIS CONSOLE.LOG ---
                console.log("Frontend message object:", message);
                // --- END ADDITION ---
                return (
                  <div
                    key={message.id}
                    className={`mb-6 ${message.role === 'user' ? 'text-right' : ''}`}
                  >
                    <div className={`inline-block p-4 rounded-lg max-w-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700'
                    }`}>
                      <div className="whitespace-pre-wrap break-words prose prose-invert prose-sm max-w-none">
                        {/* Render graph if metadata indicates it */}
                        {/* Correctly check for chartImage and pass it */}
                        {message._metadata?.type === 'graph' && message._metadata.chartImage ? (
                          <>
                            <p>{message.content}</p> {/* "Here is the graph you requested:" */}
                            <img
                              src={`data:image/png;base64,${message._metadata.chartImage}`}
                              alt={message._metadata.title_suggestion || "Generated Chart"}
                              className="w-full h-auto mt-4 rounded-lg shadow-lg"
                            />
                          </>
                        ) : (
                          // Otherwise, render regular message content
                          <MessageContent content={message.content} />
                        )}

                        {/* Original chart display (if any, though graph replaces this for bar charts) */}
                        {message.charts && message.charts.map((chart, idx) => (
                          <div key={idx} className="mt-4 bg-gray-900 p-4 rounded-lg">
                            <img
                              src={`data:image/png;base64,${chart}`}
                              alt={`Analytics chart ${idx + 1}`}
                              className="w-full h-auto"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Loading indicator */}
              {isLoading && (
                <div className="mb-6">
                  <div className="inline-block p-4 rounded-lg bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700">
                    <div className="flex items-center space-x-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-sm text-gray-400">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          ) : (
            <div className="text-center text-gray-400 py-16">
              <div className="mb-4 text-6xl">🤖</div>
              <h2 className="text-xl font-semibold mb-2">AI Assistant</h2>
              <p className="mb-4">Ask me anything about the influencers in our database!</p>
              <div className="text-sm text-gray-500">
                Try asking: "Which influencers are best for my business?" or "Make me a graph comparing the followers of @soccer_shrute and @propane_pigskin".
              </div>
            </div>
          )}
        </div>


        {/* Input Area */}
        <div className="border-t border-gray-800 p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-400">
              {messages.length > 0 && `${messages.length} messages`}
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Clear conversation
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="flex space-x-4">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about influencers in our database..."
                className="flex-1 bg-gray-900 text-white p-4 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                disabled={isLoading}
                aria-label="Chat message input"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-8 py-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[100px]"
                aria-label="Send message"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                ) : (
                  'Send'
                )}
              </button>
            </div>

            {/* Hint text */}
            <div className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
