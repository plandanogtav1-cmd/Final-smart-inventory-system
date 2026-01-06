// Client-Side AI Service using Transformers.js (Completely Free!)
// This runs AI models directly in the browser - no API calls needed

interface TransformersAI {
  pipeline: any;
  env: any;
}

declare global {
  interface Window {
    transformers?: TransformersAI;
  }
}

export class ClientSideAIService {
  private static pipeline: any = null;
  private static isLoading = false;
  private static isLoaded = false;

  /**
   * Initialize the AI model (runs in browser)
   */
  static async initialize(): Promise<boolean> {
    if (this.isLoaded) return true;
    if (this.isLoading) return false;

    try {
      this.isLoading = true;

      // Load Transformers.js dynamically
      if (!window.transformers) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.6.0/dist/transformers.min.js';
        script.type = 'module';
        
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });

        // Wait for transformers to be available
        let attempts = 0;
        while (!window.transformers && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
      }

      if (!window.transformers) {
        throw new Error('Failed to load Transformers.js');
      }

      // Configure to use local models (cached in browser)
      window.transformers.env.allowLocalModels = false;
      window.transformers.env.allowRemoteModels = true;

      // Initialize a lightweight text generation pipeline
      this.pipeline = await window.transformers.pipeline(
        'text-generation',
        'Xenova/distilgpt2', // Lightweight model that runs well in browser
        {
          quantized: true, // Use quantized version for better performance
        }
      );

      this.isLoaded = true;
      this.isLoading = false;
      return true;

    } catch (error) {
      console.error('Failed to initialize client-side AI:', error);
      this.isLoading = false;
      return false;
    }
  }

  /**
   * Generate AI response using client-side model
   */
  static async generateResponse(prompt: string, businessContext: string): Promise<string> {
    try {
      if (!this.isLoaded) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('AI model not available');
        }
      }

      // Create a focused prompt for the lightweight model
      const focusedPrompt = this.createFocusedPrompt(prompt, businessContext);

      // Generate response
      const result = await this.pipeline(focusedPrompt, {
        max_length: 150,
        temperature: 0.7,
        do_sample: true,
        top_p: 0.9,
        pad_token_id: 50256,
        num_return_sequences: 1,
      });

      if (result && result[0] && result[0].generated_text) {
        let response = result[0].generated_text;
        
        // Clean up the response
        response = response.replace(focusedPrompt, '').trim();
        response = this.enhanceResponse(response, prompt);
        
        return response;
      }

      throw new Error('No response generated');

    } catch (error) {
      console.error('Client-side AI generation error:', error);
      throw error;
    }
  }

  /**
   * Create a focused prompt for lightweight models
   */
  private static createFocusedPrompt(query: string, businessContext: string): string {
    // Extract key metrics from business context
    const metrics = this.extractKeyMetrics(businessContext);
    
    return `Business Assistant: Based on ${metrics}, here's my response to "${query}":`;
  }

  /**
   * Extract key metrics from business context for lightweight processing
   */
  private static extractKeyMetrics(context: string): string {
    const lines = context.split('\n');
    const keyMetrics = lines
      .filter(line => line.includes(':') && (
        line.includes('Total') || 
        line.includes('Revenue') || 
        line.includes('Products') || 
        line.includes('Stock')
      ))
      .slice(0, 3) // Only top 3 metrics for lightweight processing
      .join(', ');
    
    return keyMetrics || 'your business data';
  }

  /**
   * Enhance the AI response with business context
   */
  private static enhanceResponse(aiResponse: string, originalQuery: string): string {
    // Add business context and formatting
    let enhanced = aiResponse;
    
    // Add appropriate emoji based on query type
    if (originalQuery.toLowerCase().includes('sales')) {
      enhanced = '📊 ' + enhanced;
    } else if (originalQuery.toLowerCase().includes('stock') || originalQuery.toLowerCase().includes('inventory')) {
      enhanced = '📦 ' + enhanced;
    } else if (originalQuery.toLowerCase().includes('customer')) {
      enhanced = '👥 ' + enhanced;
    } else {
      enhanced = '🤖 ' + enhanced;
    }
    
    // Add AI signature
    enhanced += '\n\n*🧠 Generated by client-side AI with your business data*';
    
    return enhanced;
  }

  /**
   * Check if client-side AI is supported
   */
  static isSupported(): boolean {
    // Check for modern browser features needed for Transformers.js
    return !!(
      window.WebAssembly &&
      window.Worker &&
      window.fetch &&
      window.Promise
    );
  }

  /**
   * Get model loading status
   */
  static getStatus(): { isLoaded: boolean; isLoading: boolean; isSupported: boolean } {
    return {
      isLoaded: this.isLoaded,
      isLoading: this.isLoading,
      isSupported: this.isSupported()
    };
  }

  /**
   * Preload the model (call this when user first visits chatbot)
   */
  static async preload(): Promise<void> {
    if (!this.isLoaded && !this.isLoading && this.isSupported()) {
      // Start loading in background
      this.initialize().catch(console.error);
    }
  }
}

// Auto-preload when module is imported (if supported)
if (typeof window !== 'undefined' && ClientSideAIService.isSupported()) {
  // Delay preload to not block initial page load
  setTimeout(() => {
    ClientSideAIService.preload();
  }, 2000);
}