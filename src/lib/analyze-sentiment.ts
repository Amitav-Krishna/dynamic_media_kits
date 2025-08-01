import Sentiment from 'sentiment';
/**
 * Analyzes the sentiment of a given text.
 * @param text The input text to analyze.
 * @returns An object containing sentiment ('positive', 'neutral', 'negative'), confidence, and score.
 */

const sentiment = new Sentiment();
export default function analyzeSentiment(text: string): SentimentResult {
  console.log(text);
  const result = sentiment.analyze(text);
  return {
    sentiment: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral',
    confidence: Math.min(Math.abs(result.score) / 10, 1), // Normalize to 0-1, cap at 1
    score: result.score
  };
}
