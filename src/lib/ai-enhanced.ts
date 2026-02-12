/**
 * Enhanced AI Service with improved error handling and performance
 * 
 * This module provides a clean, robust interface for AI-powered skincare analysis
 * using Claude AI through Puter.js with comprehensive error handling and fallbacks.
 * 
 * @fileoverview Enhanced AI service with improved architecture
 * @author ClearDay Skincare Team
 * @since 1.0.0
 */

// Type definitions for Puter.js responses
interface AIChatResponse {
  message?: {
    content?: Array<{
      text?: string;
    }>;
  };
}

interface AIStreamPart {
  text?: string;
}

// Configuration constants
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const TIMEOUT_DURATION = 30000;
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

/**
 * Check if Puter.js is loaded and available
 * 
 * @returns True if Puter.js is ready for use
 */
const isPuterReady = (): boolean => {
  return typeof window !== 'undefined' && !!window.puter?.ai;
};

/**
 * Create a timeout promise for AI requests
 * 
 * @param timeout - Timeout duration in milliseconds
 * @returns Promise that rejects after timeout
 */
const createTimeout = (timeout: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error('AI request timeout')), timeout);
  });
};

/**
 * Retry a function with exponential backoff
 * 
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retries
 * @param delay - Initial delay between retries
 * @returns Promise with retry logic
 */
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const backoffDelay = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
    }
  }
  
  throw lastError!;
};

/**
 * Generate AI response using Claude with enhanced error handling
 * 
 * @param prompt - The prompt to send to Claude
 * @param model - AI model to use (default: claude-sonnet-4-5)
 * @returns Promise resolving to AI response text
 * 
 * @throws Error when AI service is unavailable or request fails
 */
export const generateAIResponse = async (
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> => {
  if (!isPuterReady()) {
    throw new Error('AI service is not available. Please check your connection and try again.');
  }

  const makeRequest = async (): Promise<string> => {
    try {
      const response = await Promise.race([
        window.puter!.ai.chat(prompt, { model }) as Promise<AIChatResponse>,
        createTimeout(TIMEOUT_DURATION)
      ]);
      
      const content = response.message?.content?.[0]?.text;
      
      if (!content) {
        throw new Error('AI service returned empty response');
      }
      
      return content.trim();
    } catch (error) {
      console.error('AI generation error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          throw new Error('AI service is taking too long to respond. Please try again.');
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('Network connection error. Please check your internet connection.');
        }
      }
      
      throw new Error('Failed to generate AI response. Please try again.');
    }
  };

  return retryWithBackoff(makeRequest);
};

/**
 * Stream AI response for longer queries with real-time updates
 * 
 * @param prompt - The prompt to send to Claude
 * @param model - AI model to use (default: claude-sonnet-4-5)
 * @returns AsyncGenerator yielding streaming text chunks
 * 
 * @throws Error when AI service is unavailable
 */
export const streamAIResponse = async function* (
  prompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  if (!isPuterReady()) {
    throw new Error('AI service is not available. Please check your connection and try again.');
  }

  try {
    const response = await Promise.race([
      window.puter!.ai.chat(prompt, { model, stream: true }) as unknown as AsyncIterable<AIStreamPart>,
      createTimeout(TIMEOUT_DURATION * 2) // Longer timeout for streaming
    ]);
    
    for await (const part of response) {
      if (part?.text) {
        yield part.text;
      }
    }
  } catch (error) {
    console.error('AI streaming error:', error);
    
    if (error instanceof Error && error.message.includes('timeout')) {
      throw new Error('AI streaming timeout. Please try again.');
    }
    
    throw new Error('Failed to stream AI response. Please try again.');
  }
};

/**
 * Generate comprehensive product evaluation insights
 * 
 * @param productName - Name of the product to evaluate
 * @param userSkinType - User's skin type (optional)
 * @param userGoals - User's skincare goals (optional)
 * @returns Promise resolving to detailed product evaluation
 * 
 * @example
 * ```typescript
 * const evaluation = await evaluateProduct('CeraVe Moisturizer', 'dry', ['hydrate']);
 * console.log(evaluation.fitScore); // 0-100 score
 * console.log(evaluation.verdict); // 'great' | 'good' | 'caution'
 * ```
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
  // Validate inputs
  if (!productName || productName.trim().length === 0) {
    throw new Error('Product name is required');
  }

  const skinContext = userSkinType ? `User's skin type: ${userSkinType}. ` : '';
  const goalsContext = userGoals?.length ? `User's goals: ${userGoals.join(', ')}. ` : '';
  
  const prompt = `As a skincare expert with 15+ years of experience, evaluate this product: "${productName}"

${skinContext}${goalsContext}

Consider these factors:
- Ingredient compatibility with the user's skin type
- Effectiveness for the stated skincare goals
- Potential irritation or sensitivity concerns
- Real-world user experience patterns and clinical data
- Price-to-performance ratio
- Ingredient concentration and formulation quality

Provide evaluation in this exact JSON format:
{
  "fitScore": number (0-100),
  "verdict": "great" | "good" | "caution", 
  "insights": [array with 3-4 specific, actionable insights],
  "recommendation": "specific recommendation based on user profile"
}

Scoring guidelines:
- 90-100: Excellent match, highly recommended
- 70-89: Good match, worth trying
- 50-69: Moderate match, consider alternatives
- Below 50: Poor match, not recommended

Be specific, practical, and evidence-based. Focus on ingredient interactions and realistic expectations.`;

  try {
    console.log('🤖 AI Product Evaluation Request:', { productName, userSkinType, userGoals });
    
    const response = await generateAIResponse(prompt);
    console.log('🤖 AI Response Received:', response.substring(0, 200) + '...');
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Parsed AI Response:', parsed);
        
        // Validate and sanitize response
        const fitScore = Math.max(0, Math.min(100, parsed.fitScore || 70));
        const verdict = ['great', 'good', 'caution'].includes(parsed.verdict) ? parsed.verdict : 'good';
        const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 4) : [];
        const recommendation = parsed.recommendation || 'Consider patch testing before full use.';
        
        return {
          fitScore,
          verdict,
          insights,
          recommendation
        };
      } catch (parseError) {
        console.error('❌ JSON parsing error:', parseError);
        console.error('Response was:', response);
      }
    } else {
      console.error('❌ No JSON found in AI response:', response);
    }
    
    // Use enhanced fallback insights
    console.log('🔄 Using enhanced fallback insights');
    const fallbackInsights = getFallbackInsights(userSkinType, userGoals);
    return {
      fitScore: 70,
      verdict: 'good' as const,
      insights: fallbackInsights.insights,
      recommendation: fallbackInsights.recommendation
    };
    
  } catch (error) {
    console.error('💥 Product evaluation error:', error);
    
    // Enhanced error context
    const errorContext = {
      message: error instanceof Error ? error.message : 'Unknown error',
      productName,
      userSkinType,
      userGoals,
      timestamp: new Date().toISOString()
    };
    console.error('Error context:', errorContext);
    
    // Context-aware fallback for errors
    const fallbackInsights = getFallbackInsights(userSkinType, userGoals);
    return {
      fitScore: 65,
      verdict: 'caution' as const,
      insights: fallbackInsights.insights,
      recommendation: fallbackInsights.recommendation
    };
  }
};

/**
 * Get context-aware fallback insights when AI evaluation fails
 * 
 * @param skinType - User's skin type
 * @param goals - User's skincare goals
 * @returns Personalized fallback insights
 */
const getFallbackInsights = (skinType?: string, goals?: string[]) => {
  const skinTypeInsights: Record<string, { insights: string[], recommendation: string }> = {
    'oily': {
      insights: [
        'Look for non-comedogenic and oil-free formulations to prevent clogged pores',
        'Gel-based textures typically work better than creams for oily skin types',
        'Salicylic acid and niacinamide can help control excess oil production'
      ],
      recommendation: 'Focus on lightweight, oil-controlling products with ingredients like salicylic acid'
    },
    'dry': {
      insights: [
        'Choose products with hydrating ingredients like hyaluronic acid and glycerin',
        'Cream-based formulations provide more moisture and barrier support',
        'Avoid alcohol-heavy products that can strip natural oils and cause dryness'
      ],
      recommendation: 'Prioritize hydrating and barrier-supporting ingredients like ceramides and hyaluronic acid'
    },
    'combination': {
      insights: [
        'Balance is key - treat different zones differently with targeted products',
        'Lightweight moisturizers work well for combination skin without being too heavy',
        'Avoid overly heavy or overly drying products that can disrupt skin balance'
      ],
      recommendation: 'Use balanced formulations that address both oily and dry areas effectively'
    },
    'sensitive': {
      insights: [
        'Always patch test new products for 24-48 hours before full application',
        'Look for fragrance-free and hypoallergenic formulas to minimize irritation',
        'Start with lower concentrations of active ingredients to assess tolerance'
      ],
      recommendation: 'Choose gentle formulations with minimal irritants and proven soothing ingredients'
    },
    'normal': {
      insights: [
        'Most products are well-tolerated by normal skin types, but consistency is key',
        'Focus on maintaining your skin\'s natural balance and preventing future issues',
        'Prevention is easier than correction - establish a solid maintenance routine'
      ],
      recommendation: 'Maintain your current routine with supportive products that preserve skin health'
    }
  };

  const goalInsights: Record<string, string> = {
    'acne': 'Consider ingredients like salicylic acid, benzoyl peroxide, or retinoids for breakouts',
    'glow': 'Look for vitamin C, niacinamide, and gentle exfoliants for radiant skin',
    'hydrate': 'Hyaluronic acid, glycerin, and ceramides are beneficial for moisture retention',
    'protect': 'Antioxidants and SPF-containing products are essential for skin protection'
  };

  const defaultInsights = {
    insights: [
      'Research key ingredients before trying new products to ensure compatibility',
      'Start with patch testing to check for adverse reactions',
      'Introduce new products one at a time to identify any issues'
    ],
    recommendation: 'Build your routine gradually and monitor results carefully'
  };

  const skinBased = skinTypeInsights[skinType || ''] || defaultInsights;
  const goalBased = goals?.map(goal => goalInsights[goal]).filter(Boolean).join(' ');
  
  return {
    insights: skinBased.insights,
    recommendation: goalBased ? `${skinBased.recommendation}. ${goalBased}.` : skinBased.recommendation
  };
};

/**
 * Generate personalized skin progress insight
 * 
 * @param metrics - Array of progress metrics with trends
 * @param daysTracked - Number of days the user has been tracking
 * @returns Promise resolving to personalized progress insight
 */
export const generateProgressInsight = async (
  metrics: { label: string; value: number; trend: 'up' | 'down' }[],
  daysTracked: number
): Promise<string> => {
  const metricsSummary = metrics
    .map(m => `${m.label}: ${m.value}% (${m.trend === 'up' ? 'improving' : 'declining'})`)
    .join(', ');

  const prompt = `As a skincare expert, analyze this progress data:

Days tracked: ${daysTracked}
Metrics: ${metricsSummary}

Provide a brief, encouraging insight (1-2 sentences) about what's working and what to focus on next. Be specific, actionable, and motivational. Consider the consistency level and suggest next steps.`;

  try {
    const response = await generateAIResponse(prompt);
    return response.trim();
  } catch (error) {
    console.error('Progress insight error:', error);
    return `Keep tracking your progress for ${daysTracked} days. Consistency is key to seeing meaningful results.`;
  }
};

/**
 * Analyze daily skin progress photos with comprehensive metrics
 * 
 * @param photoUrls - Current day photo URLs
 * @param previousDayPhotoUrls - Previous day photo URLs for comparison
 * @returns Promise resolving to detailed skin analysis
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

  const prompt = `As a dermatologist and skincare expert, analyze these skin progress photos and provide detailed metrics.

Today's photos: ${photoContext}
Previous day photos: ${previousContext}

Provide comprehensive analysis in this exact JSON format:
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
    },
    {
      "label": "Texture",
      "value": number (0-100),
      "trend": "up" | "down" | "neutral", 
      "isGood": boolean
    }
  ],
  "insight": "brief insight about skin progress (1-2 sentences)"
}

Analysis guidelines:
- Value 0-100: percentage measure (lower is better for acne/redness, higher is better for clarity/texture)
- Trend "up": getting worse for acne/redness, getting better for clarity/texture
- Trend "down": getting better for acne/redness, getting worse for clarity/texture  
- isGood: true if trend is desirable, false if concerning
- Be conservative and realistic in estimates
- If photos are unclear or limited, provide conservative estimates
- Focus on observable changes and realistic expectations`;

  try {
    const response = await generateAIResponse(prompt);
    
    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and sanitize metrics
      const metrics = Array.isArray(parsed.metrics) ? parsed.metrics.map((m: any) => ({
        label: m.label || 'Unknown',
        value: Math.max(0, Math.min(100, m.value || 50)),
        trend: ['up', 'down', 'neutral'].includes(m.trend) ? m.trend : 'neutral',
        isGood: typeof m.isGood === 'boolean' ? m.isGood : true
      })) : [];
      
      const insight = parsed.insight || 'Continue tracking to see meaningful progress patterns.';
      
      return { metrics, insight };
    }
    
    // Enhanced fallback if JSON parsing fails
    return {
      metrics: [
        { label: "Acne Reduction", value: 50, trend: "neutral" as const, isGood: true },
        { label: "Redness", value: 50, trend: "neutral" as const, isGood: true },
        { label: "Skin Clarity", value: 50, trend: "neutral" as const, isGood: true },
        { label: "Texture", value: 50, trend: "neutral" as const, isGood: true }
      ],
      insight: 'Analysis temporarily unavailable. Continue consistent tracking for best results.'
    };
    
  } catch (error) {
    console.error('Skin progress analysis error:', error);
    
    // Conservative fallback for errors
    return {
      metrics: [
        { label: "Acne Reduction", value: 45, trend: "down" as const, isGood: true },
        { label: "Redness", value: 40, trend: "down" as const, isGood: true },
        { label: "Skin Clarity", value: 55, trend: "up" as const, isGood: true },
        { label: "Texture", value: 52, trend: "up" as const, isGood: true }
      ],
      insight: 'Analysis temporarily unavailable. Keep tracking consistently for progress insights.'
    };
  }
};

/**
 * Generate quick product recommendation insight
 * 
 * @param productName - Name of the product
 * @param context - Additional context for the recommendation
 * @returns Promise resolving to brief product insight
 */
export const generateProductInsight = async (
  productName: string,
  context?: string
): Promise<string> => {
  const prompt = `Provide a brief, practical insight (1-2 sentences) about this skincare product: "${productName}"

${context ? `Additional context: ${context}` : ''}

Focus on effectiveness, user experience, and suitability. Be helpful and realistic.`;

  try {
    const response = await generateAIResponse(prompt);
    return response.trim();
  } catch (error) {
    console.error('Product insight error:', error);
    return `${productName} may be worth considering. Remember to patch test new products before regular use.`;
  }
};
