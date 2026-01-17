// Thesys API Client
// Handles communication with Thesys GenUI platform for dynamic UI generation
import axios from 'axios';
import { generatePromptWithData } from '../config/systemPrompt.js';

// Thesys API endpoint - Using OpenAI-compatible endpoint
const THESYS_API_URL = process.env.THESYS_API_URL || 'https://api.thesys.dev/v1/generate';

// Enhanced GenUI System Prompt for dynamic component generation
const GENUI_SYSTEM_PROMPT = `You are a financial UI generator for a roommate expense sharing app called "FairShare".

Your task is to generate DYNAMIC, INTERACTIVE UI components based on the user's question and data context.

IMPORTANT: You must generate UI components that adapt to the specific data and question. Don't use generic templates.

Available UI Components:
1. bar_chart - For comparing values (e.g., spending by person)
2. pie_chart - For showing proportions (e.g., category breakdown)
3. line_chart - For trends over time (e.g., spending history)
4. settlement_card - For showing who owes whom
5. transaction_table - For listing transactions with filters
6. anomaly_card - For highlighting unusual patterns
7. decision_guide - For actionable recommendations
8. comparison_view - For side-by-side comparisons
9. custom_insight - For unique insights with custom styling

DYNAMIC GENERATION RULES:
- Analyze the data to find the MOST relevant insight
- Choose the component that BEST explains the answer
- Generate data-driven text (use actual numbers, names, percentages)
- Include a "why" explanation for any recommendations
- Add context-aware follow-up suggestions

Response Format (JSON):
{
  "message": "Conversational response with specific insights",
  "ui_component": "component_name",
  "ui_data": { /* component-specific data generated from context */ },
  "suggestions": ["Contextual follow-up 1", "Action 2", "Exploration 3"],
  "generated_insight": "A unique insight discovered from the data",
  "confidence": { "level": "high|medium|low", "reason": "Explanation" }
}
`;

/**
 * Generates a response using Thesys GenUI platform
 * Thesys specializes in generating dynamic, interactive UI components
 * @param {string} userMessage - The user's input message
 * @param {object} transactions - Transaction data context
 * @param {string} conversationContext - Previous conversation context
 * @returns {object} - Structured response with message and UI components
 */
export const generateThesysResponse = async (userMessage, transactions, conversationContext = '') => {
  if (!process.env.THESYS_API_KEY) {
    throw new Error('THESYS_API_KEY is missing. Get your API key from https://thesys.dev');
  }

  const dataContext = generatePromptWithData(transactions);

  // Build enhanced prompt with GenUI instructions
  const enhancedSystemPrompt = `${GENUI_SYSTEM_PROMPT}

${dataContext}

Conversation Context: ${conversationContext || 'New conversation'}

GENERATE A DYNAMIC, DATA-DRIVEN RESPONSE:`;

  try {
    console.log('🚀 Calling Thesys GenUI API with enhanced prompt...');
    
    const response = await axios.post(
      THESYS_API_URL,
      {
        model: process.env.THESYS_MODEL || "thesys-genui-1",
        messages: [
          { 
            role: "system", 
            content: enhancedSystemPrompt 
          },
          { 
            role: "user", 
            content: userMessage 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.8, // Slightly higher for more dynamic responses
        max_tokens: 2500,
        // Enable streaming capabilities if available
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.THESYS_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Thesys-Project': process.env.THESYS_PROJECT_ID || 'finmate',
          'X-Thesys-Mode': 'genui' // Request GenUI mode
        },
        timeout: 30000
      }
    );

    console.log('✅ Thesys GenUI response received');

    // Handle different response formats
    let result;
    if (response.data.choices && response.data.choices[0]) {
      // OpenAI-compatible format
      const content = response.data.choices[0].message?.content || response.data.choices[0].text;
      result = typeof content === 'string' ? JSON.parse(content) : content;
    } else if (response.data.message) {
      // Direct Thesys format
      result = response.data;
    } else if (response.data.ui_component) {
      // GenUI format
      result = response.data;
    } else {
      // Raw response
      result = response.data;
    }

    // Validate and enhance response structure
    return validateAndNormalizeResponse(result, userMessage);

  } catch (error) {
    if (error.response) {
      console.error('Thesys API Error:', error.response.status, error.response.data);
      
      // Handle specific error codes
      if (error.response.status === 401) {
        throw new Error('Invalid Thesys API key. Please check your credentials.');
      } else if (error.response.status === 429) {
        throw new Error('Thesys API rate limit exceeded. Please try again later.');
      } else if (error.response.status === 402) {
        throw new Error('Thesys API credits exhausted. Please add more credits at https://thesys.dev');
      }
    }
    
    console.error('Thesys API connection failed:', error.message);
    throw error; // Re-throw to allow fallback to Gemini
  }
};

/**
 * Generate streaming response (for progressive UI updates)
 * @param {string} userMessage - User's message
 * @param {object} transactions - Data context
 * @param {function} onChunk - Callback for each chunk
 */
export const generateThesysStreamingResponse = async (userMessage, transactions, onChunk) => {
  if (!process.env.THESYS_API_KEY) {
    throw new Error('THESYS_API_KEY is missing');
  }

  const dataContext = generatePromptWithData(transactions);

  try {
    const response = await axios.post(
      THESYS_API_URL,
      {
        model: process.env.THESYS_MODEL || "thesys-genui-1",
        messages: [
          { role: "system", content: `${GENUI_SYSTEM_PROMPT}\n\n${dataContext}` },
          { role: "user", content: userMessage }
        ],
        stream: true,
        max_tokens: 2500
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.THESYS_API_KEY}`,
          'Content-Type': 'application/json',
          'X-Thesys-Project': process.env.THESYS_PROJECT_ID || 'finmate',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream',
        timeout: 60000
      }
    );

    let fullContent = '';
    
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim());
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            fullContent += content;
            
            if (onChunk) {
              onChunk({ type: 'chunk', content, fullContent });
            }
          } catch (e) {
            // Skip parsing errors in stream
          }
        }
      }
    });

    return new Promise((resolve, reject) => {
      response.data.on('end', () => {
        try {
          const result = JSON.parse(fullContent);
          resolve(validateAndNormalizeResponse(result, userMessage));
        } catch (e) {
          resolve({ message: fullContent, ui_component: null, ui_data: null, suggestions: [] });
        }
      });
      
      response.data.on('error', reject);
    });

  } catch (error) {
    console.error('Thesys streaming error:', error.message);
    throw error;
  }
};

/**
 * Validates and normalizes the API response to ensure consistent structure
 */
const validateAndNormalizeResponse = (response, userMessage = '') => {
  // Ensure response has required fields
  const normalized = {
    message: response.message || response.text || "I've analyzed your data.",
    ui_component: response.ui_component || response.component || null,
    ui_data: response.ui_data || response.data || null,
    suggestions: response.suggestions || response.follow_ups || [
      "Show me more details",
      "What else can you tell me?"
    ],
    confidence: response.confidence || { level: 'high', reason: 'Generated by Thesys GenUI' }
  };

  // Add generated insight if present
  if (response.generated_insight) {
    normalized.generated_insight = response.generated_insight;
  }

  // Validate UI component name
  const validComponents = [
    'bar_chart', 'pie_chart', 'transaction_table', 'settlement_card', 
    'line_chart', 'timeline', 'comparison_card', 'comparison_view',
    'anomaly_card', 'decision_guide', 'clarification_options',
    'settlement_confirmation', 'settlement_success', 'custom_insight'
  ];
  
  if (normalized.ui_component && !validComponents.includes(normalized.ui_component)) {
    console.warn(`Unknown UI component: ${normalized.ui_component}, mapping to closest match`);
    
    // Try to map unknown components to known ones
    const componentMap = {
      'chart': 'bar_chart',
      'graph': 'line_chart',
      'table': 'transaction_table',
      'cards': 'settlement_card',
      'comparison': 'comparison_view',
      'alert': 'anomaly_card',
      'action': 'decision_guide'
    };
    
    const lowerComponent = normalized.ui_component.toLowerCase();
    for (const [key, value] of Object.entries(componentMap)) {
      if (lowerComponent.includes(key)) {
        normalized.ui_component = value;
        break;
      }
    }
    
    // If still not valid, set to null
    if (!validComponents.includes(normalized.ui_component)) {
      normalized.ui_component = null;
      normalized.ui_data = null;
    }
  }

  return normalized;
};

export default {
  generateThesysResponse,
  generateThesysStreamingResponse};