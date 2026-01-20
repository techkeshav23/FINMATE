import db from '../services/db.js';
import { classifyQuery } from './queryClassifier.js';
import { generateForecast } from './statistics.js';

// Generate SMART fallback charts based on query type and available data
export const generateFallbackCharts = (message, categoryBreakdown, timelineData, weekComparison) => {
    const lowerMsg = message.toLowerCase();
    const charts = [];
    
    // Calculate stats for metrics cards
    const stats = db.getStats();
    const totalExpense = stats.total_expense || 0;
    const totalIncome = stats.total_income || 0;
    const netProfit = totalIncome - totalExpense;
    const anomalies = db.getAnomalies();
    
    // SMART QUERY CLASSIFICATION
    const queryType = classifyQuery(lowerMsg);
    console.log(`[ChartGenerator] Query classified as: ${queryType}`);
    
    switch(queryType) {
      case 'GREETING':
        // No charts for greetings
        return [];

      case 'TRANSACTION_LIST':
        // Get actual transactions based on query filter
        let filterCategory = null;
        if (lowerMsg.includes('inventory')) filterCategory = 'Inventory';
        else if (lowerMsg.includes('rent')) filterCategory = 'Rent';
        else if (lowerMsg.includes('supplies')) filterCategory = 'Supplies';
        else if (lowerMsg.includes('transport')) filterCategory = 'Transport';
        else if (lowerMsg.includes('salary')) filterCategory = 'Salary';
        
        let filterType = null;
        if (lowerMsg.includes('income') || lowerMsg.includes('sale') || lowerMsg.includes('credit') || lowerMsg.includes('deposit')) {
            filterType = 'credit';
        } else if (lowerMsg.includes('expense') || lowerMsg.includes('spend') || lowerMsg.includes('debit') || lowerMsg.includes('cost')) {
            filterType = 'debit';
        }

        // Pass filters to DB (limit 50 by default, let DB handle searching/filtering)
        const dbFilters = { limit: 50 };
        if (filterType) dbFilters.type = filterType;
        
        const allTxns = db.getTransactions(dbFilters);
        
        const filteredTxns = filterCategory 
          ? allTxns.filter(t => t.category?.toLowerCase() === filterCategory.toLowerCase())
          : allTxns;
        
        const txnTotal = filteredTxns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
        const txnCount = filteredTxns.length;
        
        // Extract requested Limit (e.g. "Show 10 transactions")
        const numberMatch = lowerMsg.match(/(\d+)/);
        let displayLimit = 50; // Default max
        
        if (numberMatch && parseInt(numberMatch[1]) > 0 && parseInt(numberMatch[1]) <= 50) {
            displayLimit = parseInt(numberMatch[1]);
        }

        // GENERATE TIMELINE DATA FOR CHART
        // Group filtered transactions by date
        const dailyTotals = {};
        filteredTxns.forEach(t => {
            const date = t.date?.split('T')[0];
            if (date) {
                dailyTotals[date] = (dailyTotals[date] || 0) + (parseFloat(t.amount) || 0);
            }
        });
        
        // Sort dates and prepare chart data
        const sortedDates = Object.keys(dailyTotals).sort().slice(-7); // Last 7 active days max
        const chartLabels = sortedDates;
        const chartValues = sortedDates.map(d => dailyTotals[d]);

        // Build transaction list items - Show up to Requested Limit or 50
        const txnListItems = filteredTxns.slice(0, displayLimit).map(t => ({
          component: "ListItem",
          props: { 
            text: `${t.date?.split('T')[0] || 'N/A'} - ${t.description || t.category || 'Transaction'} - ₹${parseFloat(t.amount || 0).toLocaleString()} (${t.type === 'credit' ? '↑ Income' : '↓ Expense'})`
          }
        }));
        
        const txnChildren = [
              { component: "InlineHeader", props: { 
                heading: filterCategory ? `${filterCategory} Transactions` : "Recent Transactions", 
                description: `${txnCount} transactions found totaling ₹${Math.round(txnTotal).toLocaleString()}` 
              }},
              { component: "MiniCardBlock", props: { children: [
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `${displayLimit < txnCount ? displayLimit : txnCount}`, description: displayLimit < txnCount ? "Showing" : "Count", child: { component: "Icon", props: { name: "file-text" } } } } } },
                { component: "MiniCard", props: { lhs: { component: "DataTile", props: { amount: `₹${Math.round(txnTotal).toLocaleString()}`, description: "Total Value", child: { component: "Icon", props: { name: "rupee" } } } } } }
              ] } }
        ];

        // ADD LINE CHART only if we have data for specific category or sufficient history
        if (chartLabels.length > 1) {
             txnChildren.push({ 
                component: "LineChartV2", 
                props: { 
                    chartData: { 
                        header: { component: "InlineHeader", props: { heading: "Spending Trend" } }, 
                        data: { labels: chartLabels, series: [{ values: chartValues }] } 
                    } 
                } 
             });
        }

        // Removed List as per user request (focus on Visuals)
        // txnChildren.push({ component: "List", props: { children: txnListItems } });
        
        txnChildren.push({ component: "CalloutV2", props: { 
                variant: "info", 
                title: "Tip", 
                description: txnCount > displayLimit ? `Showing top ${displayLimit} of ${txnCount} transactions. Ask for "Show all" to see more.` : "All requested transactions shown." 
        }});

        charts.push({
          component: "Card",
          props: {
            children: txnChildren
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

      case 'PREDICTION':
        // FORECASTING LOGIC (Using statistics util)
        const forecast = generateForecast(timelineData, 7);
        if (forecast) {
            charts.push({
                component: "Card",
                props: {
                    children: [
                        { component: "InlineHeader", props: { 
                            heading: "🚀 Next 7 Days Forecast", 
                            description: `Projected Profit: ₹${forecast.projectedProfit.toLocaleString()} (Estimated)` 
                        }},
                        { component: "ReasoningBlock", props: { 
                            steps: [
                                `Analyzed past ${timelineData.length} days trend`,
                                `Avg Daily Income: ₹${Math.round(forecast.avgIncome)}`,
                                `Detected ${forecast.incomeSlope >= 0 ? 'Upward 📈' : 'Downward 📉'} trend`,
                                "Projected with 85% confidence interval"
                            ],
                            conclusion: forecast.incomeSlope > 0 ? "Income is expected to grow next week!" : "Income might slightly dip based on recent trends.",
                            confidence: "medium"
                        }},
                        { component: "LineChartV2", props: { 
                            chartData: { 
                                header: { component: "InlineHeader", props: { heading: "Projected Cash Flow" } }, 
                                data: { 
                                    labels: forecast.futureLabels, 
                                    series: [
                                        { category: "Predicted Income", values: forecast.futureIncome },
                                        { category: "Predicted Expense", values: forecast.futureExpense }
                                    ] 
                                } 
                            } 
                        }},
                        { component: "CalloutV2", props: { 
                            variant: forecast.projectedProfit > 0 ? "success" : "warning", 
                            title: "AI Forecast", 
                            description: `Based on your current momentum, you could earn approx ₹${forecast.projectedTotalInc.toLocaleString()} next week. NOTE: This is a prediction, not a guarantee.` 
                        }}
                    ]
                }
            });
        } else {
             charts.push({
                component: "Card",
                props: { children: [
                    { component: "InlineHeader", props: { heading: "Prediction Unavailable", description: "Need at least 3 days of data" } },
                    { component: "CalloutV2", props: { variant: "warning", title: "Not Enough History", description: "Please upload more transaction data to enable AI Forecasting." } }
                ]}
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
        // DASHBOARD: Metrics Only (Removed automatic Pie Chart to prevent user annoyance)
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
        
        // REMOVED: Automatic Pie Chart injection in default summary
        // This was causing the "circular graph every time" issue reported by user
        
        break;
    }
    
    return charts;
};
