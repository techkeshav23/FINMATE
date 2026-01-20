/**
 * Calculate statistical metrics for transaction data
 */

// Calculate simple statistics (average, total)
export const calculateStats = (data) => {
    if (!data || data.length === 0) return { avgIncome: 0, avgExpense: 0, totalIncome: 0, totalExpense: 0 };
    
    const days = data.length;
    const totalIncome = data.reduce((sum, d) => sum + (d.income || 0), 0);
    const totalExpense = data.reduce((sum, d) => sum + (d.expense || 0), 0);
    
    return {
        totalIncome,
        totalExpense,
        avgIncome: totalIncome / days,
        avgExpense: totalExpense / days,
        days
    };
};

// Calculate trend slope: (Last - First) / Days
export const calculateSlope = (data) => {
    if (!data || data.length < 2) return { incomeSlope: 0, expenseSlope: 0 };
    
    const days = data.length;
    const firstDay = data[0];
    const lastDay = data[days - 1];
    
    const incomeSlope = ((lastDay.income || 0) - (firstDay.income || 0)) / days;
    const expenseSlope = ((lastDay.expense || 0) - (firstDay.expense || 0)) / days;
    
    return { incomeSlope, expenseSlope };
};

// Generate forecast for next X days
export const generateForecast = (data, daysToPredict = 7) => {
    if (!data || data.length < 3) return null;
    
    const { avgIncome, avgExpense } = calculateStats(data);
    const { incomeSlope, expenseSlope } = calculateSlope(data);
    
    const lastDay = data[data.length - 1];
    const lastDateObj = new Date(lastDay.date);
    
    const futureLabels = [];
    const futureIncome = [];
    const futureExpense = [];
    
    for (let i = 1; i <= daysToPredict; i++) {
        // Next Date
        const nextDate = new Date(lastDateObj);
        nextDate.setDate(lastDateObj.getDate() + i);
        futureLabels.push(nextDate.toISOString().split('T')[0].slice(5)); // MM-DD

        // Projection: LastValue + (Slope * i) -> Clamped to >0
        // We dampen the slope by 50% to be conservative
        let nextInc = (lastDay.income || 0) + ((incomeSlope * 0.5) * i);
        let nextExp = (lastDay.expense || 0) + ((expenseSlope * 0.5) * i);
        
        // Add some "noise" so it doesn't look robotic (+- 10% of average)
        nextInc += (Math.random() - 0.5) * (avgIncome * 0.2);
        nextExp += (Math.random() - 0.5) * (avgExpense * 0.2);

        futureIncome.push(Math.max(0, Math.round(nextInc)));
        futureExpense.push(Math.max(0, Math.round(nextExp)));
    }
    
    const projectedTotalInc = futureIncome.reduce((a, b) => a + b, 0);
    const projectedTotalExp = futureExpense.reduce((a, b) => a + b, 0);
    const projectedProfit = projectedTotalInc - projectedTotalExp;
    
    return {
        futureLabels,
        futureIncome,
        futureExpense,
        projectedTotalInc,
        projectedTotalExp,
        projectedProfit,
        incomeSlope, 
        avgIncome
    };
};
