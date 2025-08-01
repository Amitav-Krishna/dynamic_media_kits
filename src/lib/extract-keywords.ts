import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';

/** 2. Smart Keyword Ext
 * Extracts business/product keywords from a message using an AI model.
 * Includes a fallback for simple keyword extraction if AI fails.
 * @param message The user's message.
 * @returns A promise that resolves to an array of extracted keywords.
 */
export default async function extractProductKeywords(message: string): Promise<string[]> {
  try {
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      prompt: `Extract business/product keywords from this message for influencer matching: "${message}"

      Extract keywords that represent:
      1. Products/services they sell or make
      2. Industry/business type
      3. Themes, interests, or background mentioned
      4. Repeated words in business names (ignore person names)

      Rules:
      - Return 3-6 specific, searchable keywords
      - Use simple terms (not "themed" or "branding")
      - Include relevant sports, products, industries
      - Skip person names and generic business words
      - Comma-separated, no explanations
      - All keywords should be single words, agnostic to the stance of the message. For example, the messages "My name's John Vegan, and I hate meat." and "My name's John Meat-eater, and I hate vegans" should both have keywords "vegan, meat, hate".

      Examples:
      "John Propane Propane company" → propane, gas, outdoor
      "Former soccer player with dog business" → soccer, dog, sports, pet
      "BBQ restaurant owner" → bbq, food, restaurant, grill`,
      maxTokens: 40,
      temperature: 0.2
    });

    const keywords = text.split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 2 && k !== 'unknown')
      .slice(0, 6);

    console.log(`AI extracted keywords: ${keywords}`);
    return keywords;

  } catch (error) {
  console.error('AI keyword extraction failed:', error);


  }
}
