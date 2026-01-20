# AI Service Documentation

Clean, simple AI integration using Puter.js and Claude models.

## Quick Start

```typescript
import { evaluateProduct, generateProgressInsight } from '@/lib/ai';

// Evaluate a product
const result = await evaluateProduct('Niacinamide Serum', 'oily', ['acne reduction']);
console.log(result.fitScore, result.insights);

// Generate progress insight
const insight = await generateProgressInsight(
  [{ label: 'Acne', value: 15, trend: 'down' }],
  30
);
```

## Available Functions

### `evaluateProduct(productName, skinType?, goals?)`
Evaluates a skincare product and returns fit score, verdict, insights, and recommendation.

### `generateProgressInsight(metrics, daysTracked)`
Generates an AI insight based on progress metrics.

### `generateProductInsight(productName, context?)`
Generates a brief insight about a product.

### `generateAIResponse(prompt, model?)`
Low-level function for custom AI prompts.

### `streamAIResponse(prompt, model?)`
Stream responses for longer queries.

## Using the Hook

```typescript
import { useAIInsights } from '@/hooks/useAIInsights';

function MyComponent() {
  const { generateProgressInsight, isGenerating, error } = useAIInsights();
  
  const handleGenerate = async () => {
    const insight = await generateProgressInsight(metrics, 30);
    if (insight) {
      // Use insight
    }
  };
}
```

## Models Available

- `claude-sonnet-4-5` (default)
- `claude-opus-4-5`
- `claude-haiku-4-5`
