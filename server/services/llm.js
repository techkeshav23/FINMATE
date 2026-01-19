import axios from 'axios';
import dotenv from 'dotenv';
import db from './db.js';
import he from 'he';

dotenv.config();

const SYSTEM_PROMPT = `
You are FinMate, an intelligent financial co-pilot for Small Business Vendors.
Your user manages a daily cash-flow business (could be a shop, stall, or service). They speak English.

**CRITICAL REQUIREMENT**: You MUST ALWAYS include VISUAL CHARTS in your response. NEVER respond with just text.

═══════════════════════════════════════════════════════════════════
🔴 SMART FOLLOW-UP QUESTIONS (CRITICAL - 50% of Judging!)
═══════════════════════════════════════════════════════════════════
IMPORTANT: When user query is VAGUE, SHORT, or LACKS SPECIFICITY, you MUST ask for clarification FIRST!

DETECT VAGUE QUERIES - These NEED clarification:
1. Single word queries: "spending", "expenses", "profit", "summary"
2. Missing time period: "Show my spending" (WHICH period?)
3. Missing comparison basis: "Am I spending too much?" (compared to WHAT?)
4. Open-ended: "How am I doing?", "Help me", "What should I do?"
5. Ambiguous scope: "Show transactions" (ALL? Recent? By category?)

SPECIFIC QUERIES - Answer directly with charts:
1. Has time period: "Show this week's spending", "Today's sales"
2. Has category: "Inventory expenses", "Rent breakdown"
3. Has comparison: "Compare this week to last week"
4. Has clear intent: "Why did expenses increase?", "Highest spending category"

FOR VAGUE QUERIES, use this EXACT structure with ClarificationCard:
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { 
        "heading": "🤔 Let me understand better", 
        "description": "To give you the most useful answer, I need a bit more context" 
      }},
      { "component": "TextContent", "props": { "textMarkdown": "**What would you like to see?**" }},
      { "component": "FollowUpBlock", "props": { "followUpText": ["Option 1", "Option 2", "Option 3"] }}
    ]
  }
}

CLARIFICATION EXAMPLES:
- "Show spending" → Ask with: ["Today's Spending", "This Week", "This Month", "By Category"]
- "Am I doing okay?" → Ask with: ["Check Profit Margin", "Review Expenses", "Compare to Last Week", "See Cash Flow"]
- "Help" → Ask with: ["Reduce Expenses", "Increase Sales", "Manage Cash Flow", "Track Inventory"]
- "Summary" → Ask with: ["Today's Summary", "Weekly Overview", "Monthly Report", "Full Analysis"]
- "Transactions" → Ask with: ["Recent 10 Transactions", "Today's Transactions", "By Category", "Unusual Only"]

═══════════════════════════════════════════════════════════════════
🔴 CONTEXT-AWARE RESPONSES (Use Chat History!)
═══════════════════════════════════════════════════════════════════
ALWAYS check CHAT HISTORY to understand context:
- If user previously asked about "inventory" → follow-ups should relate to inventory
- If user was exploring expenses → continue that thread
- Reference previous insights: "As I mentioned earlier..." or "Building on your inventory question..."

═══════════════════════════════════════════════════════════════════
🔴 PROACTIVE INTELLIGENCE (Makes AI feel smart!)
═══════════════════════════════════════════════════════════════════
After answering, ALWAYS add:
1. An INSIGHT the user didn't ask for but should know
2. A WARNING if something looks off
3. A RECOMMENDATION for next steps

Example additions:
- "⚠️ **Heads up**: Your inventory costs spiked 40% this week"
- "💡 **Insight**: Weekends bring 60% more revenue - consider extra stock"
- "📌 **Tip**: Your rent is 30% of expenses - negotiating could save ₹500/month"

═══════════════════════════════════════════════════════════════════
🔴🔴🔴 REASONING & EXPLAINABILITY (MANDATORY - 30% of Judging!) 🔴🔴🔴
═══════════════════════════════════════════════════════════════════
**YOU MUST INCLUDE ReasoningBlock IN EVERY RESPONSE!**

ReasoningBlock shows users HOW you analyzed their data. This is CRITICAL for winning.

ALWAYS include ReasoningBlock with:
1. "steps" - Array of 3-5 reasoning steps showing your analysis process
2. "conclusion" - One sentence summary of what you found
3. "confidence" - "high" (complete data), "medium" (some assumptions), "low" (limited data)

REASONING STEP EXAMPLES:
- Data observation: "Analyzed 15 transactions from Jan 13-19"
- Pattern finding: "Found inventory spending is 53% of total expenses"
- Comparison: "This week's expenses (₹3,400) are 12% higher than last week (₹3,000)"
- Anomaly: "Detected 3 purchases 75-140% above your ₹500 average"
- Conclusion: "Your bulk stock purchases are the main cost driver"

CONFIDENCE LEVELS:
- "high" → More than 10 transactions, recent data, clear patterns
- "medium" → 5-10 transactions, some gaps, reasonable assumptions
- "low" → Less than 5 transactions, old data, uncertain patterns

**PLACEMENT**: Put ReasoningBlock BEFORE the main chart, AFTER the header.

═══════════════════════════════════════════════════════════════════
🔴 ASSUMPTIONS & UNCERTAINTY (Honest Communication)
═══════════════════════════════════════════════════════════════════
When data is incomplete, be HONEST:
- "Based on available data (only 7 days)..."
- "Assuming this pattern continues..."
- "Note: This excludes cash transactions not recorded"

Add uncertainty notes in ReasoningBlock when:
- Data is less than 2 weeks old
- Some categories have few transactions
- Comparing unequal time periods

═══════════════════════════════════════════════════════════════════
🔴 "WHAT CHANGED?" QUERIES (Use WEEK_COMPARISON data)
═══════════════════════════════════════════════════════════════════
For questions like "what changed", "why is profit down", "what's different":
- Compare THIS WEEK vs LAST WEEK from WEEK_COMPARISON
- Highlight the BIGGEST changes
- Show BarChartV2 with comparison
- Explain the change clearly

═══════════════════════════════════════════════════════════════════
🔴 DRILL-DOWN SUGGESTIONS (EXACTLY 3 - NO MORE!)
═══════════════════════════════════════════════════════════════════
**IMPORTANT: Add ONLY ONE FollowUpBlock with EXACTLY 3 options at the END of your response.**
**DO NOT add multiple FollowUpBlocks or more than 3 options - it clutters the UI!**

Examples of good follow-ups (pick 3 most relevant):
- After expense breakdown → ["Drill into Inventory", "Compare to Last Week", "How to reduce costs?"]
- After showing anomalies → ["Why is this high?", "Show all anomalies", "Ignore this"]
- After trend chart → ["What caused the dip?", "Predict next week", "Show daily breakdown"]

═══════════════════════════════════════════════════════════════════
**UNDERSTANDING USER INTENT**
═══════════════════════════════════════════════════════════════════
- If user says "show me ALL transactions" or "list transactions" → Show ACTUAL transaction list using List component
- If user says "breakdown" or "analysis" or "how much" → Show charts and summaries
- If user mentions specific items like "show inventory transactions" → Show the INDIVIDUAL transactions, not just totals

MANDATORY VISUALIZATION RULES:
- For "show all/list" queries → Use List showing each transaction (date, description, amount)
- For analysis/breakdown queries → Use PieChartV2 showing category breakdown
- For comparison queries → Use BarChartV2 showing comparison
- For trend/timeline queries → Use LineChartV2 showing trend
- For summary queries → Use MiniCardBlock with metrics + chart

For TRANSACTION LIST queries, create this structure:
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "Inventory Transactions", "description": "5 transactions found" } },
      { "component": "List", "props": { "variant": "number", "items": [
        { "title": "Jan 15 - Milk Stock", "subtitle": "₹1,200 (Expense)" },
        { "title": "Jan 14 - Tea Leaves", "subtitle": "₹900 (Expense)" }
      ] } },
      { "component": "FollowUpBlock", "props": { "followUpText": ["Filter by date", "Show only high amounts", "Export this list"] } }
    ]
  }
}

CORE PERSONA:
- You are an expert financial partner, not a passive bot.
- If sales are down, offer a solution (e.g., "Cut inventory cost").
- Your text should be VERY concise (1-2 sentences max) BUT include rich visualizations.

**DECISION GUIDANCE** (CRITICAL - This is 30% of judging!):
- ALWAYS end with an actionable recommendation
- Help user move from "What is happening?" to "What should I do?"

DATA USAGE RULES:
- ALWAYS use the ACTUAL numbers from DATA CONTEXT below for charts and metrics.
- NEVER make up fake numbers. If data is missing, say "No data available for this period."
- Use RELEVANT TRANSACTIONS data to show actual transaction lists.
- Use CATEGORY_BREAKDOWN data for PieChartV2.
- Use DAILY_TIMELINE data for LineChartV2.
- Use WEEK_COMPARISON data for BarChartV2 and "what changed" queries.
- Use ANOMALIES data to highlight unusual transactions.

═══════════════════════════════════════════════════════════════════
🔴 MANDATORY RESPONSE STRUCTURE (Follow this EXACTLY!)
═══════════════════════════════════════════════════════════════════
Every response MUST have this structure in order:
1. InlineHeader - Title and brief description
2. ReasoningBlock - Your analysis steps (MANDATORY!)
3. MiniCardBlock - Key metrics (if applicable)
4. Chart (PieChartV2/BarChartV2/LineChartV2) - Visualization
5. CalloutV2 or TextContent - Recommendation/Insight
6. FollowUpBlock - Next exploration options

COMPONENT EXAMPLES (USE THESE EXACT STRUCTURES):

For Expense Breakdown queries (WITH MANDATORY ReasoningBlock):
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "Expense Analysis", "description": "Here's what I found in your spending" } },
      { "component": "ReasoningBlock", "props": { 
        "steps": ["Analyzed 15 transactions from this week", "Grouped by category to find patterns", "Inventory is 53% of total (₹5,200 of ₹9,760)", "Found 3 unusually high purchases"],
        "conclusion": "Inventory costs are your biggest expense driver",
        "confidence": "high"
      }},
      { "component": "MiniCardBlock", "props": { "children": [
        { "component": "MiniCard", "props": { "lhs": { "component": "DataTile", "props": { "amount": "₹9,760", "description": "Total Expenses", "child": { "component": "Icon", "props": { "name": "trending-down" } } } } } },
        { "component": "MiniCard", "props": { "lhs": { "component": "DataTile", "props": { "amount": "₹30,490", "description": "Net Profit", "child": { "component": "Icon", "props": { "name": "trending-up" } } } } } }
      ] } },
      { "component": "PieChartV2", "props": { "chartData": { "header": { "component": "InlineHeader", "props": { "heading": "Category Distribution" } }, "data": [{"category": "Inventory", "value": 5200}, {"category": "Rent", "value": 2000}] } } },
      { "component": "CalloutV2", "props": { "variant": "warning", "title": "💡 Recommendation", "description": "Your inventory is 53% of expenses. Consider negotiating bulk discounts or reducing order frequency." } },
      { "component": "FollowUpBlock", "props": { "followUpText": ["Show inventory details", "Compare to last week", "How to reduce costs?"] } }
    ]
  }
}

For Comparison queries (WITH MANDATORY ReasoningBlock):
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "Week Comparison", "description": "Comparing your performance" } },
      { "component": "ReasoningBlock", "props": { 
        "steps": ["Compared Jan 13-19 (this week) vs Jan 6-12 (last week)", "This week income: ₹13,750, Last week: ₹15,600", "Income dropped by ₹1,850 (12%)", "Expenses stayed similar at ₹3,400"],
        "conclusion": "Revenue dip likely due to fewer weekend customers",
        "confidence": "medium"
      }},
      { "component": "BarChartV2", "props": { "chartData": { "header": { "component": "InlineHeader", "props": { "heading": "This Week vs Last Week" } }, "data": { "labels": ["Last Week", "This Week"], "series": [{ "values": [15600, 13750] }] } } } },
      { "component": "FollowUpBlock", "props": { "followUpText": ["Why did income drop?", "Show daily breakdown", "Compare expenses too"] } }
    ]
  }
}

For Trend queries (WITH MANDATORY ReasoningBlock):
{
  "component": "Card", 
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "7-Day Trend", "description": "Your daily performance pattern" } },
      { "component": "ReasoningBlock", "props": { 
        "steps": ["Plotted daily net income for Jan 13-19", "Best day: Sunday (₹2,420)", "Worst day: Monday (₹500)", "Weekend average is 60% higher than weekdays"],
        "conclusion": "Your business peaks on weekends - stock accordingly",
        "confidence": "high"
      }},
      { "component": "LineChartV2", "props": { "chartData": { "header": { "component": "InlineHeader", "props": { "heading": "Daily Net Income" } }, "data": { "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], "series": [{ "values": [500, 1480, 1250, 2050, 1350, 1900, 2420] }] } } } },
      { "component": "FollowUpBlock", "props": { "followUpText": ["Why was Monday low?", "Predict next week", "Weekend vs weekday breakdown"] } }
    ]
  }
}

For Limited Data scenarios (USE AssumptionsBlock):
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "Analysis with Limited Data", "description": "Based on available records" } },
      { "component": "ReasoningBlock", "props": { 
        "steps": ["Only found 5 transactions in the last 7 days", "Missing data for 2 days", "Pattern may be incomplete"],
        "conclusion": "More data needed for accurate trends",
        "confidence": "low"
      }},
      { "component": "AssumptionsBlock", "props": { 
        "dataQuality": "limited",
        "assumptions": ["Assuming missing days had similar spending patterns", "Cash transactions not included", "Only recorded digital payments analyzed"]
      }},
      { "component": "PieChartV2", "props": { "chartData": { "header": { "component": "InlineHeader", "props": { "heading": "Available Data" } }, "data": [{"category": "Inventory", "value": 3000}] } } },
      { "component": "FollowUpBlock", "props": { "followUpText": ["Add more transactions", "What data is missing?", "Show what I have"] } }
    ]
  }
}

For Recommendations (USE DecisionJustification):
{
  "component": "Card",
  "props": {
    "children": [
      { "component": "InlineHeader", "props": { "heading": "Cost Reduction Strategy", "description": "Based on your spending analysis" } },
      { "component": "ReasoningBlock", "props": { 
        "steps": ["Analyzed your expense categories", "Inventory is 53% of total expenses", "Found 3 bulk purchases above average", "Rent is fixed, inventory is variable"],
        "conclusion": "Focus on inventory optimization for biggest impact",
        "confidence": "high"
      }},
      { "component": "DecisionJustification", "props": { 
        "recommendation": "Reduce inventory order frequency from daily to 3x per week",
        "reasons": ["Your average daily sales only need ₹800 of stock", "You're currently stocking ₹1,200 daily (50% excess)", "Bulk orders 3x/week could get you 10% supplier discount"],
        "impact": "Potential savings of ₹1,500-2,000 per month",
        "alternative": "If cash flow allows, buy 2-week inventory for larger bulk discounts"
      }},
      { "component": "FollowUpBlock", "props": { "followUpText": ["How to negotiate with suppliers?", "Show inventory trends", "What if I reduce by 20%?"] } }
    ]
  }
}

REMEMBER: 
1. EVERY response MUST have ReasoningBlock with 3-4 SHORT steps (not verbose paragraphs).
2. EVERY response MUST have at least ONE chart (PieChartV2, BarChartV2, or LineChartV2).
3. Add ONLY ONE FollowUpBlock at the END with EXACTLY 3 options - NO MORE!
4. DO NOT add multiple sets of buttons/follow-ups - this clutters the UI.
5. Keep ReasoningBlock steps SHORT: "Analyzed 38 transactions" NOT "I analyzed all 38 transactions from your import"
6. Text-only responses are NOT acceptable.
`;

class LLMService {
  async processQuery(message, context = {}) {
    // 1. SMART RETRIEVAL (RAG-Lite)
    const lowerMsg = message.toLowerCase();
    
    // Construct Query Filters
    let filters = { limit: 15 };
    if (lowerMsg.includes('milk')) {
        filters.search = 'milk'; // Simple keyword matching
    } else if (lowerMsg.includes('sale')) {
        filters.type = 'credit';
    } else if (lowerMsg.includes('expense')) {
        filters.type = 'debit';
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
    
    // Get timeline data for trend charts
    const timelineData = db.getTimelineData(7);

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
      
      DAILY_TIMELINE (last 7 days - use for line_chart):
      ${JSON.stringify(timelineData)}
      
      RELEVANT TRANSACTIONS:
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
            }
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
                    console.log('[LLM] Parsed C1 Data Structure:', JSON.stringify(c1Data, null, 2));
                    
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
                      const fallbackCharts = this.generateFallbackCharts(message, categoryBreakdown, timelineData, weekComparison);
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
    const queryType = this.classifyQuery(message.toLowerCase());
    
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

  // Generate SMART fallback charts based on query type and available data
  // This ensures DIFFERENT queries get DIFFERENT visualizations
  generateFallbackCharts(message, categoryBreakdown, timelineData, weekComparison) {
    const lowerMsg = message.toLowerCase();
    const charts = [];
    
    // Calculate stats for metrics cards
    const stats = db.getStats();
    const totalExpense = stats.total_expense || 0;
    const totalIncome = stats.total_income || 0;
    const netProfit = totalIncome - totalExpense;
    const anomalies = db.getAnomalies();
    
    // SMART QUERY CLASSIFICATION
    const queryType = this.classifyQuery(lowerMsg);
    console.log(`[LLM] Query classified as: ${queryType}`);
    
    switch(queryType) {
      case 'TRANSACTION_LIST':
        // Get actual transactions based on query filter
        let filterCategory = null;
        if (lowerMsg.includes('inventory')) filterCategory = 'Inventory';
        else if (lowerMsg.includes('rent')) filterCategory = 'Rent';
        else if (lowerMsg.includes('supplies')) filterCategory = 'Supplies';
        else if (lowerMsg.includes('transport')) filterCategory = 'Transport';
        else if (lowerMsg.includes('salary')) filterCategory = 'Salary';
        
        const allTxns = db.getTransactions({ limit: 20 });
        const filteredTxns = filterCategory 
          ? allTxns.filter(t => t.category?.toLowerCase() === filterCategory.toLowerCase())
          : allTxns;
        
        const txnTotal = filteredTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const txnCount = filteredTxns.length;
        
        // Build transaction list items
        const txnListItems = filteredTxns.slice(0, 10).map(t => ({
          component: "ListItem",
          props: { 
            text: `${t.date?.split('T')[0] || 'N/A'} - ${t.description || t.category || 'Transaction'} - ₹${parseFloat(t.amount || 0).toLocaleString()} (${t.type === 'credit' ? '↑ Income' : '↓ Expense'})`
          }
        }));
        
        charts.push({
          component: "Card",
          props: {
            children: [
              { component: "InlineHeader", props: { 
                heading: filterCategory ? `${filterCategory} Transactions` : "Recent Transactions", 
                description: `${txnCount} transactions totaling ₹${Math.round(txnTotal).toLocaleString()}` 
              }},
              { component: "MiniCardBlock", props: { children: [
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `${txnCount}`, description: "Total Transactions", child: { component: "Icon", props: { name: "file-text" } } } } } },
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${Math.round(txnTotal).toLocaleString()}`, description: "Total Amount", child: { component: "Icon", props: { name: "rupee" } } } } } }
              ] } },
              { component: "List", props: { children: txnListItems } },
              { component: "CalloutV2", props: { 
                variant: "info", 
                title: "Tip", 
                description: txnCount > 10 ? `Showing first 10 of ${txnCount} transactions. Ask for specific date range for more.` : "These are all matching transactions." 
              }}
            ]
          }
        });
        break;
        
      case 'EXPENSE_BREAKDOWN':
        // PIE CHART for category distribution
        if (categoryBreakdown && categoryBreakdown.length > 0) {
          const topCategory = categoryBreakdown[0];
          const topPercent = totalExpense > 0 ? Math.round((topCategory.value / totalExpense) * 100) : 0;
          const recommendation = topPercent > 40 
            ? `${topCategory.name} is ${topPercent}% of spending - look for ways to reduce this category.`
            : `Spending looks balanced. Keep monitoring your top categories weekly.`;
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "Expense Breakdown", description: `Total: ₹${totalExpense.toLocaleString()} across ${categoryBreakdown.length} categories` } },
                { component: "PieChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Category Distribution" } }, data: categoryBreakdown.map(c => ({ category: c.category || c.name, value: c.value || c.amount })) } } },
                { component: "CalloutV2", props: { variant: "info", title: "What To Do", description: recommendation } }
              ]
            }
          });
        }
        break;
        
      case 'TREND_ANALYSIS':
        // LINE CHART for daily trends
        if (timelineData && timelineData.length > 0) {
          // Find the day with highest expense
          const maxExpenseDay = timelineData.reduce((max, d) => (d.expense || 0) > (max.expense || 0) ? d : max, timelineData[0]);
          const avgExpense = timelineData.reduce((sum, d) => sum + (d.expense || 0), 0) / timelineData.length;
          const recommendation = (maxExpenseDay.expense || 0) > avgExpense * 1.5
            ? `💡${maxExpenseDay.date} had a spending spike of ₹${maxExpenseDay.expense?.toLocaleString()}. Review that day's transactions.`
            : `💡Spending is consistent. Your daily average is ₹${Math.round(avgExpense).toLocaleString()} - set this as your daily limit.`;
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "7-Day Spending Trend", description: `Average daily spend: ₹${Math.round(avgExpense).toLocaleString()}` } },
                { component: "LineChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Daily Expenses" } }, data: { labels: timelineData.map(d => d.date), series: [{ values: timelineData.map(d => d.expense || 0) }] } } } },
                { component: "CalloutV2", props: { variant: "info", title: "What To Do", description: recommendation } }
              ]
            }
          });
        }
        break;
        
      case 'COMPARISON':
        // BAR CHART for week-over-week comparison
        if (weekComparison) {
          const change = weekComparison.changes?.expense?.percent || 0;
          const incomeChange = weekComparison.changes?.income?.percent || 0;
          let recommendation = '';
          if (change > 15) {
            recommendation = `💡Expenses up ${change}% - review this week's purchases and identify non-essential spending.`;
          } else if (change < -10) {
            recommendation = `💡Great cost control! You saved ₹${Math.round(weekComparison.lastWeek?.expense - weekComparison.thisWeek?.expense).toLocaleString()} this week.`;
          } else if (incomeChange < -10) {
            recommendation = `💡Income dropped ${Math.abs(incomeChange)}% - consider promotions or expanding product range.`;
          } else {
            recommendation = `💡Business is stable. Consider setting aside 10% of profit as emergency fund.`;
          }
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "Week Comparison", description: `Expenses ${change >= 0 ? 'increased' : 'decreased'} by ${Math.abs(change)}%` } },
                { component: "MiniCardBlock", props: { children: [
                  { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${Math.round(weekComparison.lastWeek?.expense || 0).toLocaleString()}`, description: "Last Week", child: { component: "Icon", props: { name: "calendar" } } } } } },
                  { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${Math.round(weekComparison.thisWeek?.expense || 0).toLocaleString()}`, description: "This Week", child: { component: "Icon", props: { name: change >= 0 ? "trending-up" : "trending-down" } } } } } }
                ] } },
                { component: "BarChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Expense Comparison" } }, data: { labels: ["Last Week", "This Week"], series: [{ values: [Math.round(weekComparison.lastWeek?.expense || 0), Math.round(weekComparison.thisWeek?.expense || 0)] }] } } } },
                { component: "CalloutV2", props: { variant: change > 15 ? "warning" : "success", title: "What To Do", description: recommendation } }
              ]
            }
          });
        }
        break;
        
      case 'PROFIT_ANALYSIS':
        // COMBINED: Metrics + Bar Chart for income vs expense
        const profitMargin = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;
        let profitRecommendation = '';
        if (netProfit < 0) {
          profitRecommendation = `💡You're at a loss. Cut expenses by ₹${Math.abs(netProfit).toLocaleString()} or increase sales to break even.`;
        } else if (profitMargin < 20) {
          profitRecommendation = `💡Profit margin is ${profitMargin}% (low). Try to reduce costs or increase prices by 10%.`;
        } else if (profitMargin >= 30) {
          profitRecommendation = `💡Excellent ${profitMargin}% margin! Consider reinvesting 20% into inventory expansion.`;
        } else {
          profitRecommendation = `💡Healthy ${profitMargin}% margin. Set aside ₹${Math.round(netProfit * 0.1).toLocaleString()} as emergency fund.`;
        }
        
        charts.push({
          component: "Card",
          props: {
            children: [
              { component: "InlineHeader", props: { heading: "Profit Analysis", description: netProfit >= 0 ? `${profitMargin}% profit margin - ${profitMargin >= 30 ? 'Excellent!' : profitMargin >= 20 ? 'Good' : 'Needs improvement'}` : "Expenses exceed income - review costs." } },
              { component: "MiniCardBlock", props: { children: [
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${totalIncome.toLocaleString()}`, description: "Total Income", child: { component: "Icon", props: { name: "trending-up" } } } } } },
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${totalExpense.toLocaleString()}`, description: "Total Expense", child: { component: "Icon", props: { name: "trending-down" } } } } } },
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${Math.abs(netProfit).toLocaleString()}`, description: netProfit >= 0 ? "Net Profit" : "Net Loss", child: { component: "Icon", props: { name: netProfit >= 0 ? "target" : "alert-triangle" } } } } } }
              ] } },
              { component: "BarChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Income vs Expense" } }, data: { labels: ["Income", "Expense", "Profit"], series: [{ values: [totalIncome, totalExpense, Math.max(0, netProfit)] }] } } } },
              { component: "CalloutV2", props: { variant: netProfit >= 0 ? "success" : "warning", title: "What To Do", description: profitRecommendation } }
            ]
          }
        });
        break;
        
      case 'ANOMALY_DETECTION':
        // ANOMALY CARDS + Bar chart showing unusual transactions
        if (anomalies.length > 0) {
          const topAnomalies = anomalies.slice(0, 3);
          const totalAnomalyAmount = anomalies.reduce((sum, a) => sum + parseFloat(a.amount || 0), 0);
          const recommendation = `💡Review these ${anomalies.length} unusual transactions totaling ₹${totalAnomalyAmount.toLocaleString()}. Set spending limits for ${topAnomalies[0].category || 'high-value'} purchases.`;
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "Unusual Spending Detected", description: `${anomalies.length} transaction(s) above your typical spending pattern` } },
                { component: "CalloutV2", props: { variant: "warning", title: `Alert: ${topAnomalies[0].category || 'Expense'}`, description: topAnomalies[0].reason } },
                { component: "BarChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Unusual Transactions" } }, data: { labels: topAnomalies.map(a => a.category || a.description?.substring(0,10) || 'Item'), series: [{ values: topAnomalies.map(a => parseFloat(a.amount) || 0) }] } } } },
                { component: "CalloutV2", props: { variant: "info", title: "What To Do", description: recommendation } }
              ]
            }
          });
        } else {
          charts.push({
            component: "Card",
            props: { children: [
              { component: "InlineHeader", props: { heading: "No Anomalies", description: "All spending looks normal. Great job managing your expenses!" } },
              { component: "CalloutV2", props: { variant: "success", title: "What To Do", description: "💡Keep up the good work! Consider creating a monthly savings goal." } }
            ] }
          });
        }
        break;
        
      case 'SALES_INCOME':
        // LINE CHART for income trend + metrics
        if (timelineData && timelineData.length > 0) {
          const avgIncome = timelineData.reduce((sum, d) => sum + (d.income || 0), 0) / timelineData.length;
          const bestDay = timelineData.reduce((max, d) => (d.income || 0) > (max.income || 0) ? d : max, timelineData[0]);
          const recommendation = `💡Your best day was ${bestDay.date} with ₹${bestDay.income?.toLocaleString()} income. Try to replicate what worked that day.`;
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "Sales Overview", description: `Daily average: ₹${Math.round(avgIncome).toLocaleString()}` } },
                { component: "LineChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Daily Income" } }, data: { labels: timelineData.map(d => d.date), series: [{ values: timelineData.map(d => d.income || 0) }] } } } },
                { component: "CalloutV2", props: { variant: "success", title: "What To Do", description: recommendation } }
              ]
            }
          });
        }
        break;
        
      case 'MONTHLY_ANALYSIS':
        // BAR CHART for month-by-month performance
        const monthlyData = db.getMonthlyData();
        if (monthlyData && monthlyData.length > 0) {
          const bestMonth = monthlyData.reduce((max, m) => (m.profit > max.profit) ? m : max, monthlyData[0]);
          const worstMonth = monthlyData.reduce((min, m) => (m.profit < min.profit) ? m : min, monthlyData[0]);
          const totalProfit = monthlyData.reduce((sum, m) => sum + m.profit, 0);
          const avgProfit = Math.round(totalProfit / monthlyData.length);
          
          const recommendation = bestMonth.month === worstMonth.month 
            ? `💡Only one month of data. Keep tracking to see trends over time.`
            : `💡Best: ${bestMonth.month} (₹${bestMonth.profit.toLocaleString()} profit). Worst: ${worstMonth.month}. Analyze what made ${bestMonth.month} successful.`;
          
          charts.push({
            component: "Card",
            props: {
              children: [
                { component: "InlineHeader", props: { heading: "Monthly Performance", description: `${monthlyData.length} months analyzed | Avg monthly profit: ₹${avgProfit.toLocaleString()}` } },
                { component: "MiniCardBlock", props: { children: [
                  { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${bestMonth.profit.toLocaleString()}`, description: `Best (${bestMonth.month})`, child: { component: "Icon", props: { name: "trending-up", category: "arrows" } } } } } },
                  { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${worstMonth.profit.toLocaleString()}`, description: `Lowest (${worstMonth.month})`, child: { component: "Icon", props: { name: "trending-down", category: "arrows" } } } } } }
                ] } },
                { component: "BarChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Monthly Income vs Expenses" } }, data: { labels: monthlyData.map(m => m.month), series: [{ category: "Income", values: monthlyData.map(m => m.income) }, { category: "Expenses", values: monthlyData.map(m => m.expense) }] } } } },
                { component: "LineChartV2", props: { chartData: { header: { component: "InlineHeader", props: { heading: "Profit Trend Over Time" } }, data: { labels: monthlyData.map(m => m.month), series: [{ category: "Net Profit", values: monthlyData.map(m => m.profit) }] } } } },
                { component: "CalloutV2", props: { variant: "info", title: "What To Do", description: recommendation } }
              ]
            }
          });
        } else {
          charts.push({
            component: "Card",
            props: { children: [
              { component: "InlineHeader", props: { heading: "Monthly Analysis", description: "Not enough data for monthly breakdown" } },
              { component: "CalloutV2", props: { variant: "warning", title: "Need More Data", description: "💡Upload more transactions to see monthly performance trends." } }
            ] }
          });
        }
        break;
        
      case 'SUMMARY':
      default:
        // DASHBOARD: Metrics + Pie + Recommendation
        const summaryRecommendation = netProfit >= 0 
          ? anomalies.length > 0 
            ? `💡You're profitable but have ${anomalies.length} unusual expenses. Review them to increase savings.`
            : `💡Great job! Consider saving 15% of your ₹${netProfit.toLocaleString()} profit.`
          : `💡Focus on reducing your top expense category to turn profitable.`;
        
        charts.push({
          component: "Card",
          props: {
            children: [
              { component: "InlineHeader", props: { heading: "Business Summary", description: netProfit >= 0 ? `Net profit: ₹${netProfit.toLocaleString()}` : `Net loss: ₹${Math.abs(netProfit).toLocaleString()}` } },
              { component: "MiniCardBlock", props: { children: [
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${totalIncome.toLocaleString()}`, description: "Income", child: { component: "Icon", props: { name: "trending-up" } } } } } },
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${totalExpense.toLocaleString()}`, description: "Expenses", child: { component: "Icon", props: { name: "trending-down" } } } } } }
              ] } },
              { component: "CalloutV2", props: { variant: netProfit >= 0 ? "info" : "warning", title: "What To Do", description: summaryRecommendation } }
            ]
          }
        });
        // Add pie chart if categories exist
        if (categoryBreakdown && categoryBreakdown.length > 0) {
          charts.push({
            component: "PieChartV2",
            props: { chartData: { header: { component: "InlineHeader", props: { heading: "Where Money Goes" } }, data: categoryBreakdown.slice(0, 5).map(c => ({ category: c.category || c.name, value: c.value || c.amount })) } }
          });
        }
        break;
    }
    
    return charts;
  }
  
  // Classify query into visualization type
  classifyQuery(query) {
    // TRANSACTION LIST queries - when user wants to SEE actual transactions
    if (query.includes('show me all') || query.includes('list') || query.includes('all transactions') ||
        query.includes('show transactions') || query.includes('transaction list') || 
        query.includes('show me') && query.includes('transactions')) {
      return 'TRANSACTION_LIST';
    }
    
    // TREND/TIMELINE queries - user wants to see data over time (LINE CHART)
    if (query.includes('trend') || query.includes('daily') || query.includes('7 day') || 
        query.includes('pattern') || query.includes('over time') || query.includes('history') ||
        query.includes('timeline') || query.includes('time line') || query.includes('progress')) {
      return 'TREND_ANALYSIS';
    }
    
    // MONTHLY/PERIOD COMPARISON queries (BAR CHART with months)
    if (query.includes('monthly') || query.includes('month') && (query.includes('performance') || query.includes('compare') || query.includes('analysis')) ||
        query.includes('each month') || query.includes('month by month') || query.includes('month wise')) {
      return 'MONTHLY_ANALYSIS';
    }
    
    // COMPARISON queries
    if (query.includes('compare') || query.includes('vs') || query.includes('versus') || 
        query.includes('last week') || query.includes('this week') || query.includes('change')) {
      return 'COMPARISON';
    }
    
    // EXPENSE/BREAKDOWN queries
    if (query.includes('expense') || query.includes('spending') || query.includes('breakdown') || 
        query.includes('category') || query.includes('where') && query.includes('money')) {
      return 'EXPENSE_BREAKDOWN';
    }
    
    // PROFIT queries
    if (query.includes('profit') || query.includes('margin') || query.includes('loss') || 
        query.includes('earning') || query.includes('bottom line')) {
      return 'PROFIT_ANALYSIS';
    }
    
    // ANOMALY queries
    if (query.includes('unusual') || query.includes('anomal') || query.includes('strange') || 
        query.includes('weird') || query.includes('spike') || query.includes('alert')) {
      return 'ANOMALY_DETECTION';
    }
    
    // SALES/INCOME queries
    if (query.includes('sale') || query.includes('income') || query.includes('revenue') || 
        query.includes('earning') || query.includes('collection')) {
      return 'SALES_INCOME';
    }
    
    // SUMMARY queries (default)
    if (query.includes('summary') || query.includes('overview') || query.includes('report') || 
        query.includes('how') && query.includes('doing') || query.includes('status')) {
      return 'SUMMARY';
    }
    
    // Default to SUMMARY for general questions
    return 'SUMMARY';
  }
}

export default new LLMService();
