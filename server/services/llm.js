import axios from 'axios';
import dotenv from 'dotenv';
import db from './db.js';
import he from 'he';

dotenv.config();

import { SYSTEM_PROMPT } from './prompts.js';
import { classifyQuery } from '../utils/queryClassifier.js';
import { generateFallbackCharts } from '../utils/chartGenerator.js';



class LLMService {
  async processQuery(message, context = {}) {
    // 1. SMART RETRIEVAL (RAG-Lite) - ENHANCED
    const lowerMsg = message.toLowerCase();
    
    // A. MONTH DETECTION FIRST - Support both short (jan) and full (january) names
    const monthMap = {
      'jan': 'january', 'january': 'january',
      'feb': 'february', 'february': 'february',
      'mar': 'march', 'march': 'march',
      'apr': 'april', 'april': 'april',
      'may': 'may',
      'jun': 'june', 'june': 'june',
      'jul': 'july', 'july': 'july',
      'aug': 'august', 'august': 'august',
      'sep': 'september', 'sept': 'september', 'september': 'september',
      'oct': 'october', 'october': 'october',
      'nov': 'november', 'november': 'november',
      'dec': 'december', 'december': 'december'
    };
    const monthMatch = Object.keys(monthMap).find(m => lowerMsg.includes(m));
    const detectedMonth = monthMatch ? monthMap[monthMatch] : null;
    
    // Construct Query Filters
    let filters = { limit: 50 };
    
    // Add month filter if detected
    if (detectedMonth) {
      filters.month = detectedMonth;
      delete filters.limit; // No limit when filtering by month - show all
    }

    // B. Detect Financial Intent (Credit vs Debit) 
    if (lowerMsg.includes('sale') || lowerMsg.includes('income') || lowerMsg.includes('revenue') || lowerMsg.includes('credit') || lowerMsg.includes('deposit')) {
        filters.type = 'credit';
    } else if (lowerMsg.includes('expense') || lowerMsg.includes('spend') || lowerMsg.includes('cost') || lowerMsg.includes('debit') || lowerMsg.includes('payment')) {
        filters.type = 'debit';
    }

    // B. Keyword Extraction for "Smart Search"
    // We filter out common stop words to find the "Object" of interest (e.g., "Milk", "Uber", "Rent")
    const stopWords = [
        // Articles & Prepositions
        'show', 'me', 'the', 'for', 'of', 'in', 'on', 'at', 'to', 'from', 'by', 'with', 'about', 'a', 'an', 'and', 'or',
        // Question words
        'what', 'where', 'when', 'how', 'why', 'who', 'which', 'is', 'are', 'was', 'were', 'did', 'do', 'does', 'can', 'could',
        // Financial Nouns/Verbs (General tokens, not specific items)
        'transaction', 'transactions', 'expense', 'expenses', 'spending', 'spent', 'spend', 'cost', 'costs',
        'price', 'prices', 'amount', 'amounts', 'money', 'total', 'sum', 'average', 'count', 'pay', 'paid', 'payment',
        'income', 'sales', 'revenue', 'profit', 'loss', 'credit', 'debit', 'budget', 'balance',
        // Time identifiers (We exclude these as they shouldn't match description names usually)
        'day', 'days', 'daily', 'week', 'weeks', 'weekly', 'month', 'months', 'monthly', 'year', 'years', 'yearly',
        'today', 'yesterday', 'tomorrow', 'now', 'current', 'past', 'future', 'last', 'this', 'next', 'date', 'time', 'recent',
        // Request words
        'analysis', 'analyze', 'report', 'summary', 'overview', 'details', 'list', 'check', 'find', 'search', 'get', 'give', 'help'
    ];

    // Clean and tokenize
    const cleanMsg = lowerMsg.replace(/[.,?!:;"'()]/g, ' ');
    const words = cleanMsg.split(/\s+/);
    
    // Filter words to find potential search terms
    const possibleKeywords = words.filter(word => 
        word.length > 2 && // Skip 1-2 letter words
        !stopWords.includes(word) && 
        isNaN(word) // Skip numbers
    );

    // Heuristic: If we found keywords, use the most significant one
    // For a prototype, the Longest specific noun is often the best guess for a Category or Description
    if (possibleKeywords.length > 0) {
        // Sort by length (descending) to prioritize specific terms like 'vegetables' over 'buy'
        possibleKeywords.sort((a, b) => b.length - a.length);
        
        // Use the top match as the search filter
        filters.search = possibleKeywords[0];
        console.log(`[LLM] Smart RAG Extracted Term: '${filters.search}' from query: '${message}'`);
    } else {
        // Fallback for logic if no specific noun found (just rely on filters.type or date defaults)
        console.log(`[LLM] No specific search term found in query: '${message}'`);
    }

    // Fetch from Local DB Code
    const relevantTxns = db.getTransactions(filters);
    
    // Calculate live stats
    const stats = db.getStats();
    
    // CHECK: If no data exists, prompt user to upload CSV first
    const allTxns = db.getTransactions({});
    if (allTxns.length === 0) {
      return {
        reasoning: ["Checked database", "No transaction data found"],
        response: "📂 **No data yet!** Please upload your transaction CSV file first to get started. Click the 'Import Data' button above to upload your business transactions.",
        components: [
          {
            type: "clarification",
            props: {
              question: "How would you like to get started?",
              options: [
                "Upload CSV file",
                "Learn about FinMate",
                "See sample queries"
              ]
            }
          }
        ],
        confidence: "high",
        suggestions: ["Upload my transactions", "What can FinMate do?", "Show me an example"]
      };
    }
    
    // Get category breakdown for pie charts (Fix #5)
    const categoryBreakdown = db.getCategoryBreakdown();
    
    // Get anomalies for alerts (Fix #3)
    const anomalies = db.getAnomalies();
    
    // Get week comparison for "what changed" (Fix #4)
    const weekComparison = db.getWeekComparison();
    
    // Get monthly data for long-term trends
    const monthlyData = db.getMonthlyData();

    // Smart date range detection for timeline data (reuse detectedMonth from above)
    let timelineDays = 7; // Default: 7 days
    
    if (detectedMonth) {
      timelineDays = 31; // Full month
    } else if (lowerMsg.includes('month') || lowerMsg.includes('monthly')) {
      timelineDays = 31; // Full month (current)
    } else if (lowerMsg.includes('week') || lowerMsg.includes('weekly')) {
      timelineDays = 7;
    } else if (lowerMsg.includes('year') || lowerMsg.includes('yearly') || lowerMsg.includes('annual')) {
      timelineDays = 365;
    } else if (lowerMsg.includes('quarter') || lowerMsg.includes('3 month')) {
      timelineDays = 90;
    }

    // Get timeline data for trend charts (with optional month filter)
    const timelineData = db.getTimelineData(timelineDays, detectedMonth);
    
    // Dynamic timeline label
    const timelineLabel = detectedMonth 
      ? `${detectedMonth.charAt(0).toUpperCase() + detectedMonth.slice(1)} daily data` 
      : `Last ${timelineDays} days`;

    const dataContext = `
      GLOBAL STATS:
      Total Income: ₹${stats.total_income || 0}
      Total Expense: ₹${stats.total_expense || 0}
      Net Profit: ₹${(stats.total_income || 0) - (stats.total_expense || 0)}
      
      CATEGORY_BREAKDOWN (use for pie charts):
      ${JSON.stringify(categoryBreakdown)}
      
      ANOMALIES (unusual transactions - highlight these!):
      ${anomalies.length > 0 ? JSON.stringify(anomalies) : 'No anomalies detected'}
      
      WEEK_COMPARISON (this week vs last week):
      ${JSON.stringify(weekComparison)}

      MONTHLY_PERFORMANCE (last 6 months - use for monthly analysis):
      ${JSON.stringify(monthlyData)}
      
      DAILY_TIMELINE (${timelineLabel} - use for LineChartV2):
      IMPORTANT: Use EXACT dates from this data for chart labels!
      ${JSON.stringify(timelineData)}
      
      RELEVANT TRANSACTIONS (${relevantTxns.length} transactions):
      ${JSON.stringify(relevantTxns)}
    `;

    // 2. Prepare Prompt
    const fullPrompt = `${SYSTEM_PROMPT}
    
    DATA CONTEXT:
    ${dataContext}
    
    CHAT HISTORY:
    ${JSON.stringify(context.history || [])}
    
    USER QUERY: ${message}
    
    OUTPUT JSON ONLY:`;

    try {
      if (process.env.THESYS_API_KEY) {
        // Thesys (Claude) API Call
        const response = await axios.post(
          process.env.THESYS_API_URL, 
          {
            model: process.env.THESYS_MODEL,
            messages: [
              { role: "user", content: fullPrompt }
            ]
          },
          {
            headers: {
              'Authorization': `Bearer ${process.env.THESYS_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 60000 // 60s timeout to prevent hanging
          }
        );

        // Handle Response Format
        let responseText = '';
        if (response.data && response.data.choices && response.data.choices[0]) {
            responseText = response.data.choices[0].message.content;
        } else if (response.data && response.data.content) {
            responseText = response.data.content;
        } else {
            console.log('Unexpected Thesys Response:', response.data);
            responseText = JSON.stringify(response.data);
        }
        
        // --- C1 / Thesys Parser ---
        // If response is wrapped in <content thesys="true">, extract inner JSON
        if (responseText && responseText.includes('<content')) {
            console.log('[LLM] Detected C1 Content Wrapper');
            try {
                // 1. Extract content between tags
                const match = responseText.match(/<content[^>]*>([\s\S]*?)<\/content>/);
                if (match && match[1]) {
                    // 2. Decode HTML entities
                    const decoded = he.decode(match[1]);
                    // 3. Parse C1 Component Tree
                    const c1Data = JSON.parse(decoded);
                    // console.log('[LLM] Parsed C1 Data Structure:', JSON.stringify(c1Data, null, 2)); // Reduced logging for cleaner production output

                    
                    // 4. Extract "Hidden" JSON from Markdown (if model followed instructions)
                    // Recursive search for standard JSON block
                    const findJsonInTree = (node) => {
                        if (!node) return null;
                        
                        // Check TextContent
                        if (node.component === 'TextContent' && node.props && node.props.textMarkdown) {
                            const md = node.props.textMarkdown;
                            const jsonMatch = md.match(/```json\s*([\s\S]*?)```/);
                            if (jsonMatch && jsonMatch[1]) {
                                try {
                                    return JSON.parse(jsonMatch[1]);
                                } catch (e) { console.error("Found JSON block but failed to parse", e); }
                            }
                            // Also check for raw JSON if model forgot code block
                            if (md.trim().startsWith('{') && md.trim().endsWith('}')) {
                                try { return JSON.parse(md); } catch (e) { }
                            }
                        }
                        
                        // Recurse children
                        if (node.props && node.props.children && Array.isArray(node.props.children)) {
                            for (const child of node.props.children) {
                                const found = findJsonInTree(child);
                                if (found) return found;
                            }
                        }
                        return null;
                    };

                    const structuredData = findJsonInTree(c1Data.component);
                    if (structuredData) {
                        console.log('[LLM] Found structured legacy JSON in C1 tree');
                        return structuredData;
                    }

                    // 5. Fallback: If no JSON block found, extract plain text for chat
                    const extractText = (node) => {
                         if (!node) return '';
                         let text = '';
                         if (node.component === 'TextContent' && node.props?.textMarkdown) {
                             text += node.props.textMarkdown + '\n';
                         }
                         
                         const children = node.props?.children;
                         if (Array.isArray(children)) {
                             children.forEach(c => text += extractText(c));
                         } else if (children && typeof children === 'object') {
                             text += extractText(children);
                         }
                         return text;
                    };
                    
                    const plainText = extractText(c1Data.component).trim();
                    console.log('[LLM] No legacy JSON found. Using Native C1 Component.');
                    
                    // IF WE REACHED HERE: It means we found NO JSON in the C1 Output.
                    // This means Thesys generated a Native UI Tree (not our custom JSON).
                    
                    // CHECK: Does the response include charts? If not, we need to add them!
                    const hasCharts = this.checkForCharts(c1Data.component);
                    console.log('[LLM] Response has charts:', hasCharts);
                    
                    let components = [ c1Data.component ];
                    
                    // FORCE ADD CHARTS if missing!
                    if (!hasCharts) {
                      console.log('[LLM] No charts in response - adding fallback charts');
                      const fallbackCharts = generateFallbackCharts(message, categoryBreakdown, timelineData, weekComparison);
                      components = [...components, ...fallbackCharts];
                    }
                    
                    // Generate contextual fallback text based on user query
                    const contextualText = plainText || this.getContextualFallback(message);
                    
                    // Generate contextual suggestions based on query
                    const contextualSuggestions = this.getContextualSuggestions(message);
                    
                    return {
                        reasoning: ["Using Thesys Native Generative UI"],
                        response: contextualText,
                        components: components,
                        suggestions: contextualSuggestions
                    };
                }
            } catch (parseError) {
                console.error("Error parsing C1 content:", parseError);
                // Return error response instead of mock
                return {
                  reasoning: ["Failed to parse AI response"],
                  response: `⚠️ Could not parse AI response. Please try again.`,
                  components: [],
                  confidence: "low",
                  suggestions: ["Try again", "Rephrase your question"],
                  isError: true
                };
            }
        } else {
             console.log('[LLM] No C1 Wrapper found. Parsing standard response.');
        }

        // Standard parsing (if not C1 wrapped or fallback)
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanedText);

      } else {
        // No API key configured
        throw new Error('THESYS_API_KEY not configured. Please add it to your .env file.');
      }
    } catch (error) {
      console.error("Thesys API Error:", error.response ? error.response.data : error.message);
      // Return error response - no mock data
      return {
        reasoning: ["API connection failed"],
        response: `⚠️ Could not connect to AI service. Error: ${error.message || 'Unknown error'}. Please check your API key and try again.`,
        components: [],
        confidence: "low",
        suggestions: ["Try again", "Check API configuration"],
        isError: true
      };
    }
  }

  // Generate contextual fallback text based on user query
  getContextualFallback(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('weekly') || lowerMsg.includes('week')) {
      return "Here's your weekly business overview.";
    }
    if (lowerMsg.includes('today') || lowerMsg.includes('daily')) {
      return "Here's your today's business summary.";
    }
    if (lowerMsg.includes('expense') || lowerMsg.includes('spending')) {
      return "Here's your expense breakdown.";
    }
    if (lowerMsg.includes('sale') || lowerMsg.includes('income') || lowerMsg.includes('revenue')) {
      return "Here's your sales overview.";
    }
    if (lowerMsg.includes('inventory') || lowerMsg.includes('stock')) {
      return "Here's your inventory breakdown.";
    }
    if (lowerMsg.includes('profit') || lowerMsg.includes('margin')) {
      return "Here's your profit analysis.";
    }
    if (lowerMsg.includes('compare') || lowerMsg.includes('vs') || lowerMsg.includes('versus')) {
      return "Here's your comparison analysis.";
    }
    if (lowerMsg.includes('trend') || lowerMsg.includes('pattern')) {
      return "Here's the trend I found in your data.";
    }
    
    return "I've prepared this view based on your data.";
  }

  // Generate contextual follow-up suggestions based on query type
  getContextualSuggestions(message) {
    const queryType = classifyQuery(message.toLowerCase());
    
    // Provide suggestions that lead to DIFFERENT visualizations + include simulation!
    switch(queryType) {
      case 'TRANSACTION_LIST':
        return ["Show expense breakdown", "7-day spending trend", "Any unusual spending?"];
      case 'EXPENSE_BREAKDOWN':
        return ["Show 7-day trend", "Compare this week vs last", "List all transactions"];
      case 'TREND_ANALYSIS':
        return ["Expense categories", "Compare weeks", "Show all transactions"];
      case 'COMPARISON':
        return ["Show expense breakdown", "Daily spending trend", "List recent transactions"];
      case 'PROFIT_ANALYSIS':
        return ["Where does money go?", "Sales trend", "Show all expenses"];
      case 'ANOMALY_DETECTION':
        return ["Full expense breakdown", "Weekly comparison", "List unusual transactions"];
      case 'SALES_INCOME':
        return ["Expense breakdown", "Profit analysis", "Show all income transactions"];
      case 'SUMMARY':
      default:
        return ["Expense breakdown", "7-day trend", "Show recent transactions"];
    }
  }

  // Check if a component tree contains any chart components
  checkForCharts(node) {
    if (!node) return false;
    
    const chartTypes = ['PieChartV2', 'BarChartV2', 'LineChartV2', 'pie_chart', 'bar_chart', 'line_chart'];
    
    // Check current node
    if (chartTypes.includes(node.component) || chartTypes.includes(node.type)) {
      return true;
    }
    
    // Check children
    const children = node.props?.children || node.children;
    if (Array.isArray(children)) {
      return children.some(child => this.checkForCharts(child));
    } else if (children && typeof children === 'object') {
      return this.checkForCharts(children);
    }
    
    return false;
  }

  }

export default new LLMService();
