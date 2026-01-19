# Sample Data Files

This folder contains sample transaction data for testing and demonstration purposes.

## Available Files

| File | Duration | Transactions | Best For |
|------|----------|--------------|----------|
| `1-month-sample.csv` | 30 days | ~45 transactions | Quick demo |
| `6-month-sample.csv` | 180 days | ~180 transactions | Trend analysis |
| `12-month-sample.csv` | 365 days | ~365 transactions | Full year patterns |

## CSV Format

```csv
date,type,amount,category,description
2026-01-15,CREDIT,1500,Sales,Morning sales
2026-01-15,DEBIT,500,Inventory,Stock purchase
```

## Fields

| Field | Type | Description |
|-------|------|-------------|
| `date` | YYYY-MM-DD | Transaction date |
| `type` | CREDIT/DEBIT | Income or expense |
| `amount` | Number | Amount in ₹ |
| `category` | String | Category name |
| `description` | String | Transaction details |

## Usage

1. Open FinMate
2. Click "Import Data" button
3. Select any CSV file from this folder
4. Start asking questions!

## Sample Queries to Try

After importing data, try these:
- "Show me today's summary"
- "What are my top expenses?"
- "Compare this week to last week"
- "Show spending trends"
- "Any unusual transactions?"
