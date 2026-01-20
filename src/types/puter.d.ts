/**
 * TypeScript declarations for Puter.js
 */
declare namespace Puter {
  interface AIChatOptions {
    model?: string;
    stream?: boolean;
  }

  interface AIMessageContent {
    text: string;
  }

  interface AIMessage {
    content: AIMessageContent[];
  }

  interface AIChatResponse {
    message: AIMessage;
  }

  interface AIStreamPart {
    text?: string;
  }

  interface AI {
    chat: (
      prompt: string,
      options?: AIChatOptions
    ) => Promise<AIChatResponse | AsyncIterable<AIStreamPart>>;
  }
}

interface Window {
  puter?: {
    ai: Puter.AI;
  };
}
