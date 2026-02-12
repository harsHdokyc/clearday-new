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
 * Returns null if AI evaluation fails
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
} | null> => {
  const skinContext = userSkinType ? `User's skin type: ${userSkinType}. ` : '';
  const goalsContext = userGoals?.length ? `User's goals: ${userGoals.join(', ')}. ` : '';
  
  const prompt = `As a skincare expert, evaluate this product: "${productName}"

${skinContext}${goalsContext}

Consider:
- Ingredient compatibility with skin type
- Effectiveness for stated goals
- Potential irritation or sensitivity concerns
- Real-world user experience patterns

Provide evaluation in JSON format:
{
  "fitScore": number (0-100),
  "verdict": "great" | "good" | "caution", 
  "insights": [array with 3-4 specific, actionable insights],
  "recommendation": "specific recommendation based on skin profile"
}

Be specific and practical. Focus on ingredient interactions and realistic expectations.`;

  try {
    console.log('AI Product Evaluation Prompt:', prompt);
    const response = await generateAIResponse(prompt);
    console.log('AI Response:', response);
    
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('Parsed AI Response:', parsed);
        
        // Validate response structure
        if (typeof parsed.fitScore !== 'number' || !['great', 'good', 'caution'].includes(parsed.verdict)) {
          console.error('Invalid product evaluation structure:', parsed);
          return null;
        }
        
        if (!Array.isArray(parsed.insights) || parsed.insights.length === 0) {
          console.error('Invalid insights in product evaluation:', parsed.insights);
          return null;
        }
        
        if (!parsed.recommendation || typeof parsed.recommendation !== 'string') {
          console.error('Invalid recommendation in product evaluation:', parsed.recommendation);
          return null;
        }
        
        return {
          fitScore: Math.max(0, Math.min(100, parsed.fitScore)),
          verdict: parsed.verdict,
          insights: parsed.insights,
          recommendation: parsed.recommendation
        };
      } catch (parseError) {
        console.error('JSON parsing error:', parseError, 'Response was:', response);
        return null;
      }
    } else {
      console.error('No JSON found in AI response:', response);
      return null;
    }
  } catch (error) {
    console.error('Product evaluation error:', error);
    console.error('Error details:', {
      message: error?.message,
      stack: error?.stack,
      productName,
      userSkinType,
      userGoals
    });
    return null;
  }
};


/**
 * Generate skin progress insight
 * Returns null if insufficient data or AI fails
 */
export const generateProgressInsight = async (
  metrics: { label: string; value: number; trend: 'up' | 'down' }[],
  daysTracked: number
): Promise<string | null> => {
  // Validate input data
  if (!metrics || metrics.length === 0 || daysTracked < 2) {
    return null;
  }
  
  // Ensure we have meaningful metrics (not all zeros)
  const hasMeaningfulData = metrics.some(m => m.value > 0);
  if (!hasMeaningfulData) {
    return null;
  }

  const metricsSummary = metrics
    .map(m => `${m.label}: ${m.value}% (${m.trend === 'up' ? 'improving' : 'declining'})`)
    .join(', ');

  const prompt = `Analyze this skincare progress data:

Days tracked: ${daysTracked}
Metrics: ${metricsSummary}

Provide a brief, encouraging insight (1-2 sentences) about what's working and what to focus on. Be specific and actionable.`;

  try {
    const response = await generateAIResponse(prompt);
    const trimmedResponse = response.trim();
    
    // Validate response is meaningful
    if (trimmedResponse.length < 10) {
      console.error('AI progress insight too short:', trimmedResponse);
      return null;
    }
    
    return trimmedResponse;
  } catch (error) {
    console.error('Progress insight error:', error);
    return null;
  }
};

/**
 * Analyze daily skin progress photos
 * Returns null if insufficient data for analysis
 */
export const analyzeSkinProgress = async (
  photoUrls: { front?: string; right?: string; left?: string },
  previousDayPhotoUrls?: { front?: string; right?: string; left?: string }
): Promise<{
  metrics: { label: string; value: number; trend: 'up' | 'down' | 'neutral'; isGood: boolean }[];
  insight: string;
} | null> => {
  // Validate current photos exist
  const hasCurrentPhotos = photoUrls.front || photoUrls.right || photoUrls.left;
  if (!hasCurrentPhotos) {
    return null;
  }

  // Validate comparison photos exist
  const hasComparisonPhotos = previousDayPhotoUrls?.front || previousDayPhotoUrls?.right || previousDayPhotoUrls?.left;
  if (!hasComparisonPhotos) {
    return null;
  }

  const photoContext = Object.entries(photoUrls)
    .filter(([_, url]) => url)
    .map(([view, url]) => `${view} view: available`)
    .join(', ');

  const previousContext = Object.entries(previousDayPhotoUrls)
    .filter(([_, url]) => url)
    .map(([view, url]) => `${view} view: available`)
    .join(', ');

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
- Only provide analysis if photos are clear enough for comparison`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the response structure
      if (!parsed.metrics || !Array.isArray(parsed.metrics) || parsed.metrics.length !== 3) {
        console.error('Invalid metrics structure in AI response:', parsed);
        return null;
      }

      const validatedMetrics = parsed.metrics.map((m: any) => {
        // Validate each metric has required fields
        if (!m.label || typeof m.value !== 'number' || !['up', 'down', 'neutral'].includes(m.trend)) {
          console.error('Invalid metric structure:', m);
          return null;
        }
        
        return {
          label: m.label,
          value: Math.max(0, Math.min(100, m.value)),
          trend: m.trend,
          isGood: typeof m.isGood === 'boolean' ? m.isGood : true
        };
      });

      // Ensure all metrics are valid
      if (validatedMetrics.some(m => m === null)) {
        console.error('Some metrics failed validation:', validatedMetrics);
        return null;
      }

      if (!parsed.insight || typeof parsed.insight !== 'string') {
        console.error('Invalid insight in AI response:', parsed.insight);
        return null;
      }

      return {
        metrics: validatedMetrics,
        insight: parsed.insight
      };
    }
    
    console.error('No valid JSON found in AI response:', response);
    return null;
  } catch (error) {
    console.error('Skin progress analysis error:', error);
    return null;
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
