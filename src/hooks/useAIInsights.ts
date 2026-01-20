import { useState, useCallback } from 'react';
import * as aiService from '@/lib/ai';

/**
 * Hook for generating AI insights
 * Simple, clean interface for dashboard and other components
 */
export function useAIInsights() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateProgressInsight = useCallback(async (
    metrics: { label: string; value: number; trend: 'up' | 'down' }[],
    daysTracked: number
  ): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const insight = await aiService.generateProgressInsight(metrics, daysTracked);
      return insight;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const generateProductInsight = useCallback(async (
    productName: string,
    context?: string
  ): Promise<string | null> => {
    setIsGenerating(true);
    setError(null);

    try {
      const insight = await aiService.generateProductInsight(productName, context);
      return insight;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate insight';
      setError(errorMessage);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    generateProgressInsight,
    generateProductInsight,
    isGenerating,
    error,
  };
}
