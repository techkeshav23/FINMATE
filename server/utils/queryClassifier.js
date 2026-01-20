export const classifyQuery = (query) => {
    // GREETING queries - No charts needed
    if (query.match(/^(hello|hi|hey|greetings|good morning|good afternoon|good evening|namaste)/i) && query.split(' ').length < 4) {
      return 'GREETING';
    }

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
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const hasMonthName = months.some(m => query.includes(m));

    if (query.includes('monthly') || query.includes('month') || hasMonthName ||
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

    // PREDICTION/FORECAST queries
    if (query.includes('predict') || query.includes('forecast') || query.includes('future') || 
        query.includes('upcoming') || query.includes('next week') || query.includes('next month') ||
        query.includes('how much will') || query.includes('expected')) {
      return 'PREDICTION';
    }
    
    // SUMMARY queries (default)
    if (query.includes('summary') || query.includes('overview') || query.includes('report') || 
        query.includes('how') && query.includes('doing') || query.includes('status')) {
      return 'SUMMARY';
    }
    
    // Default to SUMMARY for general questions
    return 'SUMMARY';
};
