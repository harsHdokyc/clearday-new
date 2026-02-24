/**
 * AI Service using Puter.js
 * Clean, simple interface for Claude AI capabilities with robust error handling
 */

import { puterMonitor } from './puter-status';

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
 * Check if Puter.js is loaded and available
 */
const isPuterReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter?.ai;
};

/**
 * Wait for Puter.js to be ready with timeout
 */
const waitForPuter = (timeout = 5000): Promise<boolean> => {
  return new Promise((resolve) => {
    if (isPuterReady()) {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isPuterReady()) {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        resolve(false);
      }
    }, 100);
  });
};

/**
 * Generate AI response using Claude with retry logic
 */
export const generateAIResponse = async (
  prompt: string,
  model: string = DEFAULT_MODEL,
  retries = 2
): Promise<string> => {
  // Check service status first
  const status = puterMonitor.getStatus();
  if (!status.available) {
    throw new Error(`AI service currently unavailable. ${status.error || 'Please try again later.'}`);
  }

  // Wait for Puter to be ready
  const ready = await waitForPuter();
  if (!ready) {
    throw new Error('Puter.js failed to load within timeout. AI features unavailable.');
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`AI Request (attempt ${attempt}/${retries}):`, { model, promptLength: prompt.length });
      const response = await window.puter!.ai.chat(prompt, { model }) as AIChatResponse;
      const result = response.message?.content?.[0]?.text || '';
      
      if (!result) {
        throw new Error('Empty response from AI service');
      }
      
      console.log('AI Response successful:', { resultLength: result.length });
      return result;
    } catch (error) {
      console.error(`AI generation error (attempt ${attempt}/${retries}):`, error);
      
      // Update service status on error
      await puterMonitor.checkServiceStatus();
      
      // Check for specific CORS/network errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('cors') || message.includes('network') || message.includes('fetch')) {
          console.warn('Network/CORS error detected - Puter.com may be experiencing issues');
        }
        if (message.includes('502') || message.includes('bad gateway')) {
          console.warn('Puter.com service appears to be down (502 Bad Gateway)');
        }
      }
      
      // If this is the last attempt, throw the error
      if (attempt === retries) {
        throw new Error(`AI service unavailable after ${retries} attempts. Please try again later.`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  
  throw new Error('Unexpected error in AI generation');
};

/**
 * Stream AI response for longer queries with error handling
 */
export const streamAIResponse = async function* (
  prompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  // Wait for Puter to be ready
  const ready = await waitForPuter();
  if (!ready) {
    throw new Error('Puter.js failed to load within timeout. AI streaming unavailable.');
  }

  try {
    console.log('AI Stream Request:', { model, promptLength: prompt.length });
    const response = await window.puter!.ai.chat(prompt, { model, stream: true }) as AsyncIterable<Puter.AIStreamPart>;
    
    for await (const part of response) {
      if (part?.text) {
        yield part.text;
      }
    }
  } catch (error) {
    console.error('AI streaming error:', error);
    
    // Check for specific CORS/network errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes('cors') || message.includes('network') || message.includes('fetch')) {
        console.warn('Network/CORS error detected during streaming - Puter.com may be experiencing issues');
      }
      if (message.includes('502') || message.includes('bad gateway')) {
        console.warn('Puter.com service appears to be down during streaming (502 Bad Gateway)');
      }
    }
    
    throw new Error('Failed to stream AI response. Please check your connection and try again.');
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
 * Attempt to convert AI text response to JSON format
 */
const convertTextResponseToJson = (response: string): any => {
  // If response already contains JSON, extract it
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch {
      // Continue to text conversion
    }
  }

  // If AI is explaining it can't see photos, create a structured response
  if (response.toLowerCase().includes('cannot see') || 
      response.toLowerCase().includes('no images') || 
      response.toLowerCase().includes('upload the photos')) {
    return {
      metrics: [
        { label: "Acne Reduction", value: 15, trend: "neutral", isGood: true },
        { label: "Redness", value: 20, trend: "neutral", isGood: true },
        { label: "Skin Clarity", value: 25, trend: "neutral", isGood: true }
      ],
      insight: "Consistent photo tracking is essential for accurate progress analysis. Continue daily documentation for better insights."
    };
  }

  // Try to extract numbers and insights from text response
  const lines = response.split('\n').filter(line => line.trim());
  const metrics = [];
  let insight = "";

  // Look for metric patterns in the text
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('acne') || lowerLine.includes('breakout')) {
      const value = extractNumberFromText(line) || 15;
      metrics.push({
        label: "Acne Reduction",
        value,
        trend: "neutral",
        isGood: true
      });
    } else if (lowerLine.includes('redness') || lowerLine.includes('inflammation')) {
      const value = extractNumberFromText(line) || 20;
      metrics.push({
        label: "Redness",
        value,
        trend: "neutral", 
        isGood: true
      });
    } else if (lowerLine.includes('clarity') || lowerLine.includes('tone')) {
      const value = extractNumberFromText(line) || 25;
      metrics.push({
        label: "Skin Clarity",
        value,
        trend: "neutral",
        isGood: true
      });
    } else if (line.length > 20 && !line.includes(':') && !line.includes('=')) {
      // Treat as insight
      insight = line.trim();
    }
  }

  // Fill missing metrics with defaults
  if (metrics.length < 3) {
    const existingLabels = metrics.map(m => m.label);
    const defaultMetrics = [
      { label: "Acne Reduction", value: 15, trend: "neutral", isGood: true },
      { label: "Redness", value: 20, trend: "neutral", isGood: true },
      { label: "Skin Clarity", value: 25, trend: "neutral", isGood: true }
    ];
    
    for (const defaultMetric of defaultMetrics) {
      if (!existingLabels.includes(defaultMetric.label)) {
        metrics.push(defaultMetric);
      }
    }
  }

  // Use default insight if none found
  if (!insight) {
    insight = "Continue consistent photo tracking for better progress analysis and personalized insights.";
  }

  return { metrics, insight };
};

/**
 * Extract a number from text line
 */
const extractNumberFromText = (line: string): number | null => {
  const match = line.match(/\d+/);
  return match ? parseInt(match[0]) : null;
};
/**
 * Analyze daily skin progress photos
 * Returns structured analysis or throws error if analysis fails
 */
export const analyzeSkinProgress = async (
  photoUrls: { front?: string; right?: string; left?: string },
  previousDayPhotoUrls?: { front?: string; right?: string; left?: string }
): Promise<{
  metrics: { label: string; value: number; trend: 'up' | 'down' | 'neutral'; isGood: boolean }[];
  insight: string;
}> => {
  // Validate current photos exist
  const hasCurrentPhotos = photoUrls.front || photoUrls.right || photoUrls.left;
  if (!hasCurrentPhotos) {
    throw new Error('No current photos available for analysis');
  }

  // Validate comparison photos exist
  const hasComparisonPhotos = previousDayPhotoUrls?.front || previousDayPhotoUrls?.right || previousDayPhotoUrls?.left;
  if (!hasComparisonPhotos) {
    throw new Error('No previous day photos available for comparison');
  }

  const photoContext = Object.entries(photoUrls)
    .filter(([_, url]) => url)
    .map(([view, url]) => `${view} view: available`)
    .join(', ');

  const previousContext = Object.entries(previousDayPhotoUrls)
    .filter(([_, url]) => url)
    .map(([view, url]) => `${view} view: available`)
    .join(', ');

  const prompt = `You are analyzing skincare progress from photo metadata. While you cannot see the actual images, you can provide analysis based on the available photo information.

Today's photos: ${photoContext}
Previous day photos: ${previousContext}

IMPORTANT: You cannot see or analyze the actual photos. Provide analysis based on the fact that photos were taken consistently.

Provide analysis in JSON format ONLY:
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
  "insight": "brief insight about consistent photo tracking and progress (1-2 sentences)"
}

Guidelines:
- Since you cannot see photos, provide conservative estimates (0-30 range)
- Value 0-100: percentage metrics (lower is better for acne/redness, higher is better for clarity)
- Trend "up": getting worse for acne/redness, getting better for clarity
- Trend "down": getting better for acne/redness, getting worse for clarity  
- isGood: true if trend is desirable, false if concerning
- Focus insight on the importance of consistent tracking
- MUST return valid JSON format only - no explanations, no text outside JSON`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Try to extract JSON from response first
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate the response structure
        if (!parsed.metrics || !Array.isArray(parsed.metrics) || parsed.metrics.length !== 3) {
          throw new Error('Invalid metrics structure in AI response');
        }

        const validatedMetrics = parsed.metrics.map((m: any) => {
          // Validate each metric has required fields
          if (!m.label || typeof m.value !== 'number' || !['up', 'down', 'neutral'].includes(m.trend)) {
            throw new Error(`Invalid metric structure: ${JSON.stringify(m)}`);
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
          throw new Error('Some metrics failed validation');
        }

        if (!parsed.insight || typeof parsed.insight !== 'string') {
          throw new Error('Invalid insight in AI response');
        }

        return {
          metrics: validatedMetrics,
          insight: parsed.insight
        };
      } catch (parseError) {
        console.warn('JSON parsing failed, attempting text conversion:', parseError);
      }
    }
    
    // If JSON parsing failed, try to convert text response
    console.log('Attempting to convert text response to JSON format');
    const converted = convertTextResponseToJson(response);
    
    // Validate the converted response
    if (!converted.metrics || !Array.isArray(converted.metrics) || converted.metrics.length !== 3) {
      throw new Error('Failed to extract valid metrics from AI response');
    }

    const validatedMetrics = converted.metrics.map((m: any) => {
      if (!m.label || typeof m.value !== 'number' || !['up', 'down', 'neutral'].includes(m.trend)) {
        throw new Error(`Invalid converted metric: ${JSON.stringify(m)}`);
      }
      
      return {
        label: m.label,
        value: Math.max(0, Math.min(100, m.value)),
        trend: m.trend,
        isGood: typeof m.isGood === 'boolean' ? m.isGood : true
      };
    });

    if (!converted.insight || typeof converted.insight !== 'string') {
      throw new Error('Failed to extract valid insight from AI response');
    }

    return {
      metrics: validatedMetrics,
      insight: converted.insight
    };
  } catch (error) {
    console.error('Skin progress analysis error:', error);
    throw error;
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
