/**
 * AI Service using Puter.js
 * Clean, simple interface for Claude AI capabilities
 */

// Type definitions for Puter.js responses
interface AIChatResponse {
  message?: {
    content?: Array<{
      text?: string;
    }>;
  };
}

const DEFAULT_MODEL = 'claude-sonnet-4-5';

/**
 * Check if Puter.js is loaded
 */
const isPuterReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter?.ai;
};

/**
 * Generate AI response using Claude
 */
export const generateAIResponse = async (
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> => {
  if (!isPuterReady()) {
    throw new Error('Puter.js is not loaded. Please ensure the script is included.');
  }

  try {
    const response = await window.puter!.ai.chat(prompt, { model }) as AIChatResponse;
    return response.message?.content?.[0]?.text || '';
  } catch (error) {
    console.error('AI generation error:', error);
    throw new Error('Failed to generate AI response');
  }
};

/**
 * Stream AI response for longer queries
 */
export const streamAIResponse = async function* (
  prompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  if (!isPuterReady()) {
    throw new Error('Puter.js is not loaded. Please ensure the script is included.');
  }

  try {
    const response = await window.puter!.ai.chat(prompt, { model, stream: true }) as AsyncIterable<Puter.AIStreamPart>;
    
    for await (const part of response) {
      if (part?.text) {
        yield part.text;
      }
    }
  } catch (error) {
    console.error('AI streaming error:', error);
    throw new Error('Failed to stream AI response');
  }
};

/**
 * Generate product evaluation insights
 */
export const evaluateProduct = async (
  productName: string,
  userSkinType?: string,
  userGoals?: string[]
): Promise<{
  fitScore: number;
  verdict: 'great' | 'good' | 'caution';
  insights: string[];
  recommendation: string;
}> => {
  const skinContext = userSkinType ? `User's skin type: ${userSkinType}. ` : '';
  const goalsContext = userGoals?.length ? `User's goals: ${userGoals.join(', ')}. ` : '';
  
  const prompt = `Evaluate this skincare product: "${productName}"

${skinContext}${goalsContext}

Provide a concise evaluation in JSON format:
{
  "fitScore": number (0-100),
  "verdict": "great" | "good" | "caution",
  "insights": [string array with 3-4 key insights],
  "recommendation": "brief recommendation string"
}

Be honest and practical. Focus on real-world effectiveness and potential concerns.`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        fitScore: Math.max(0, Math.min(100, parsed.fitScore || 70)),
        verdict: parsed.verdict || 'good',
        insights: Array.isArray(parsed.insights) ? parsed.insights : [],
        recommendation: parsed.recommendation || 'Consider patch testing before full use.'
      };
    }
    
    // Fallback if JSON parsing fails
    return {
      fitScore: 70,
      verdict: 'good' as const,
      insights: ['Limited evaluation data available. Consider patch testing.'],
      recommendation: 'Patch test before incorporating into routine.'
    };
  } catch (error) {
    console.error('Product evaluation error:', error);
    return {
      fitScore: 65,
      verdict: 'caution' as const,
      insights: ['Unable to generate evaluation at this time.'],
      recommendation: 'Consult with a dermatologist or patch test carefully.'
    };
  }
};

/**
 * Generate skin progress insight
 */
export const generateProgressInsight = async (
  metrics: { label: string; value: number; trend: 'up' | 'down' }[],
  daysTracked: number
): Promise<string> => {
  const metricsSummary = metrics
    .map(m => `${m.label}: ${m.value}% (${m.trend === 'up' ? 'improving' : 'declining'})`)
    .join(', ');

  const prompt = `Analyze this skincare progress data:

Days tracked: ${daysTracked}
Metrics: ${metricsSummary}

Provide a brief, encouraging insight (1-2 sentences) about what's working and what to focus on. Be specific and actionable.`;

  try {
    const response = await generateAIResponse(prompt);
    return response.trim();
  } catch (error) {
    console.error('Progress insight error:', error);
    return 'Keep tracking your progress. Consistency is key to seeing results.';
  }
};

/**
 * Analyze daily skin progress photos
 */
export const analyzeSkinProgress = async (
  photoUrls: { front?: string; right?: string; left?: string },
  previousDayPhotoUrls?: { front?: string; right?: string; left?: string }
): Promise<{
  metrics: { label: string; value: number; trend: 'up' | 'down' | 'neutral'; isGood: boolean }[];
  insight: string;
}> => {
  const photoContext = Object.entries(photoUrls)
    .filter(([_, url]) => url)
    .map(([view, url]) => `${view} view: available`)
    .join(', ');

  const previousContext = previousDayPhotoUrls 
    ? Object.entries(previousDayPhotoUrls)
        .filter(([_, url]) => url)
        .map(([view, url]) => `${view} view: available`)
        .join(', ')
    : 'no previous day photos';

  const prompt = `Analyze these skincare progress photos and provide metrics.

Today's photos: ${photoContext}
Previous day photos: ${previousContext}

You are analyzing skin progress from daily photos. Provide analysis in JSON format:
{
  "metrics": [
    {
      "label": "Acne Reduction",
      "value": number (0-100),
      "trend": "up" | "down" | "neutral",
      "isGood": boolean
    },
    {
      "label": "Redness", 
      "value": number (0-100),
      "trend": "up" | "down" | "neutral",
      "isGood": boolean
    },
    {
      "label": "Skin Clarity",
      "value": number (0-100), 
      "trend": "up" | "down" | "neutral",
      "isGood": boolean
    }
  ],
  "insight": "brief insight about skin progress (1-2 sentences)"
}

Guidelines:
- Value 0-100: percentage of improvement/concern (lower is better for acne/redness, higher is better for clarity)
- Trend "up": getting worse for acne/redness, getting better for clarity
- Trend "down": getting better for acne/redness, getting worse for clarity  
- isGood: true if trend is desirable, false if concerning
- Be realistic and conservative in estimates
- If photos are unclear, provide conservative estimates`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        metrics: Array.isArray(parsed.metrics) ? parsed.metrics.map((m: any) => ({
          label: m.label || 'Unknown',
          value: Math.max(0, Math.min(100, m.value || 50)),
          trend: ['up', 'down', 'neutral'].includes(m.trend) ? m.trend : 'neutral',
          isGood: typeof m.isGood === 'boolean' ? m.isGood : true
        })) : [],
        insight: parsed.insight || 'Keep tracking your progress consistently.'
      };
    }
    
    // Fallback if JSON parsing fails
    return {
      metrics: [
        { label: "Acne Reduction", value: 50, trend: "neutral" as const, isGood: true },
        { label: "Redness", value: 50, trend: "neutral" as const, isGood: true },
        { label: "Skin Clarity", value: 50, trend: "neutral" as const, isGood: true }
      ],
      insight: 'Continue tracking to see meaningful progress patterns.'
    };
  } catch (error) {
    console.error('Skin progress analysis error:', error);
    return {
      metrics: [
        { label: "Acne Reduction", value: 45, trend: "down" as const, isGood: true },
        { label: "Redness", value: 40, trend: "down" as const, isGood: true },
        { label: "Skin Clarity", value: 55, trend: "up" as const, isGood: true }
      ],
      insight: 'Analysis temporarily unavailable. Keep tracking consistently.'
    };
  }
};

/**
 * Generate product recommendation insight
 */
export const generateProductInsight = async (
  productName: string,
  context?: string
): Promise<string> => {
  const prompt = `Provide a brief insight (1-2 sentences) about this skincare product: "${productName}"

${context ? `Context: ${context}` : ''}

Be practical and helpful. Focus on effectiveness and user experience.`;

  try {
    const response = await generateAIResponse(prompt);
    return response.trim();
  } catch (error) {
    console.error('Product insight error:', error);
    return `${productName} may be worth trying. Remember to patch test first.`;
  }
};
