// PDF Statement Parser
// Parses bank statement PDFs using pdf-parse library
// Enhanced with merchant normalization, learning capabilities, and fuzzy matching

import pdf from 'pdf-parse';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LEARNED_PATTERNS_FILE = path.join(__dirname, '../data/learnedPatterns.json');

// Load and save learned patterns
let learnedPatterns = {
  merchantMappings: {},     // "SWIGGY*DELHI" -> "Swiggy"
  categoryCorrections: {},  // "SWIGGY" -> "Food" (user corrections)
  customPatterns: [],       // User-taught patterns
  parsingStats: {           // Track parsing success for improvement
    totalParsed: 0,
    correctionsMade: 0,
    bankStats: {}
  }
};

const loadLearnedPatterns = () => {
  try {
    if (fs.existsSync(LEARNED_PATTERNS_FILE)) {
      const data = fs.readFileSync(LEARNED_PATTERNS_FILE, 'utf8');
      learnedPatterns = { ...learnedPatterns, ...JSON.parse(data) };
    }
  } catch (e) {
    console.log('No learned patterns file found, starting fresh');
  }
};

const saveLearnedPatterns = () => {
  try {
    const dir = path.dirname(LEARNED_PATTERNS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(LEARNED_PATTERNS_FILE, JSON.stringify(learnedPatterns, null, 2));
  } catch (e) {
    console.error('Failed to save learned patterns:', e);
  }
};

// Initialize learned patterns
loadLearnedPatterns();

// Bank-specific PDF parsing patterns - EXPANDED
const BANK_PATTERNS = {
  HDFC: {
    identifier: /HDFC\s*Bank/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr)?/g,
      /(\d{2}-[A-Z]{3}-\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(Dr|Cr)?/gi, // 15-JAN-2024 format
    ],
    dateFormats: ['DD/MM/YY', 'DD-MMM-YYYY']
  },
  ICICI: {
    identifier: /ICICI\s*Bank/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+(?:INR\s*)?([\d,]+\.\d{2})/g,
      /(\d{2}\/\d{2}\/\d{4})\s+([A-Z0-9\s\-\/\*]+)\s+([\d,]+\.\d{2})/g
    ],
    dateFormats: ['DD/MM/YYYY', 'DD/MM/YYYY']
  },
  SBI: {
    identifier: /State\s*Bank\s*of\s*India|SBI/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g,
      /(\d{2}\s+[A-Z]{3}\s+\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/gi // 15 Jan 2024
    ],
    dateFormats: ['DD/MM/YYYY', 'DD MMM YYYY']
  },
  AXIS: {
    identifier: /Axis\s*Bank/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(DR|CR)?/gi,
      /(\d{2}-\d{2}-\d{4})\s+([A-Z0-9\/\-\s\*]+?)\s+([\d,]+\.\d{2})/gi
    ],
    dateFormats: ['DD-MM-YYYY', 'DD-MM-YYYY']
  },
  KOTAK: {
    identifier: /Kotak\s*Mahindra/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g
    ],
    dateFormats: ['DD/MM/YYYY']
  },
  YES: {
    identifier: /YES\s*Bank/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s*(DR|CR)?/gi
    ],
    dateFormats: ['DD/MM/YYYY']
  },
  INDUSIND: {
    identifier: /IndusInd\s*Bank/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g
    ],
    dateFormats: ['DD/MM/YYYY']
  },
  BOB: {
    identifier: /Bank\s*of\s*Baroda|BOB/i,
    transactionPatterns: [
      /(\d{2}[-\/]\d{2}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})/g
    ],
    dateFormats: ['DD/MM/YYYY']
  }
};

// Category detection keywords - EXPANDED with more variations
const CATEGORY_KEYWORDS = {
  'Food': [
    'swiggy', 'zomato', 'food', 'restaurant', 'cafe', 'pizza', 'dominos', 'mcdonalds', 'kfc', 
    'burger', 'dining', 'eat', 'uber eats', 'dunzo', 'faasos', 'behrouz', 'box8', 'eatfit',
    'biryani', 'subway', 'starbucks', 'chaayos', 'haldiram', 'barbeque', 'dhabha', 'mess',
    'canteen', 'tiffin', 'meal', 'lunch', 'dinner', 'breakfast', 'thali', 'restaurant'
  ],
  'Groceries': [
    'grocery', 'groceries', 'bigbasket', 'blinkit', 'zepto', 'dmart', 'reliance fresh', 
    'more', 'supermarket', 'vegetables', 'fruits', 'instamart', 'jiomart', 'spencers',
    'spar', 'fresh', 'mart', 'kirana', 'daily needs', 'provisions', 'staples', 'milk',
    'dairy', 'bread', 'eggs', 'atta', 'rice', 'dal', 'oil'
  ],
  'Utilities': [
    'electricity', 'electric', 'power', 'water', 'gas', 'wifi', 'internet', 'broadband', 
    'airtel', 'jio', 'bsnl', 'bill', 'tata power', 'bescom', 'torrent', 'adani', 
    'mahanagar', 'vodafone', 'vi', 'postpaid', 'prepaid', 'recharge', 'dth', 'tatasky',
    'dish tv', 'airtel xstream', 'pipeline', 'cylinder', 'lpg', 'indane', 'hp gas'
  ],
  'Rent': [
    'rent', 'housing', 'landlord', 'flat', 'apartment', 'society', 'maintenance',
    'pg', 'paying guest', 'hostel', 'room rent', 'house rent', 'accommodation',
    'lease', 'deposit', 'brokerage'
  ],
  'Entertainment': [
    'netflix', 'prime', 'hotstar', 'spotify', 'movie', 'cinema', 'pvr', 'inox', 
    'gaming', 'game', 'xbox', 'playstation', 'youtube', 'apple music', 'gaana',
    'jio saavn', 'zee5', 'sony liv', 'mx player', 'voot', 'alt balaji', 'disney',
    'bookmyshow', 'paytm movies', 'concert', 'event', 'show', 'play', 'theatre'
  ],
  'Transport': [
    'uber', 'ola', 'rapido', 'metro', 'petrol', 'diesel', 'fuel', 'parking', 'toll',
    'cab', 'taxi', 'irctc', 'railways', 'bus', 'redbus', 'abhibus', 'auto', 'rickshaw',
    'fastag', 'dmrc', 'namma metro', 'bmtc', 'best', 'bike', 'yulu', 'bounce', 'vogo',
    'servicing', 'car wash', 'ev charging', 'indigo', 'spicejet', 'air india', 'flight'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'shopping', 'mall', 'clothes', 
    'fashion', 'meesho', 'tata cliq', 'snapdeal', 'firstcry', 'lenskart', 'bewakoof',
    'zara', 'h&m', 'lifestyle', 'pantaloons', 'westside', 'max', 'shoppers stop',
    'central', 'brand factory', 'decathlon', 'croma', 'reliance digital', 'vijay sales'
  ],
  'Household': [
    'cleaning', 'repair', 'maintenance', 'pest', 'plumber', 'electrician', 'furniture',
    'urban company', 'housejoy', 'pepperfry', 'ikea', 'hometown', 'nilkamal', 'godrej',
    'appliance', 'ac service', 'washing machine', 'fridge', 'carpenter', 'painter',
    'mason', 'civil', 'renovation', 'interior', 'curtains', 'mattress', 'bedding'
  ],
  'Health': [
    'pharmacy', 'medical', 'hospital', 'doctor', 'clinic', 'apollo', 'pharmeasy', 
    'netmeds', 'medicine', '1mg', 'tata health', 'medlife', 'practo', 'cult', 'gym',
    'fitness', 'yoga', 'healthify', 'lab test', 'diagnostic', 'pathology', 'dental',
    'eye care', 'optician', 'insurance', 'health insurance', 'mediclaim'
  ],
  'Education': [
    'udemy', 'coursera', 'skillshare', 'linkedin learning', 'unacademy', 'byjus',
    'vedantu', 'whitehat', 'coding', 'course', 'training', 'certification', 'exam',
    'fee', 'tuition', 'books', 'stationery', 'library', 'upgrad', 'great learning'
  ],
  'Transfer': [
    'transfer', 'neft', 'imps', 'rtgs', 'upi', 'self transfer', 'own account',
    'fund transfer', 'to self', 'savings', 'fd', 'fixed deposit', 'mutual fund',
    'investment', 'sip', 'zerodha', 'groww', 'upstox', 'paytm money'
  ],
  'Subscription': [
    'subscription', 'membership', 'premium', 'annual', 'monthly', 'renewal',
    'auto debit', 'recurring', 'emi', 'installment', 'credit card', 'cc payment'
  ]
};

// MERCHANT NORMALIZATION - Clean up messy transaction descriptions
const MERCHANT_NORMALIZATIONS = {
  // Food delivery
  'swiggy': ['SWIGGY*', 'SWIGGY PRIVATE', 'BUNDL TECH', 'BUNDL*'],
  'zomato': ['ZOMATO*', 'ZOMATO PVT', 'ZOMATO ORDER'],
  'uber eats': ['UBER* EATS', 'UBEREATS*'],
  
  // Transport
  'uber': ['UBER* TRIP', 'UBER*TRIP', 'UBER BV'],
  'ola': ['OLA*', 'ANI TECH', 'OLACABS'],
  'rapido': ['RAPIDO*', 'ROPPEN*'],
  
  // Shopping
  'amazon': ['AMAZON*', 'AMZN*', 'AMZ*', 'AMAZON PAY', 'AMAZON SELLER'],
  'flipkart': ['FLIPKART*', 'FK*', 'FLIPKART INTERNET'],
  'myntra': ['MYNTRA*', 'MYNTRA DESIGNS'],
  
  // Groceries
  'bigbasket': ['BIGBASKET*', 'SUPERMARKET GROCERY', 'BB DAILY'],
  'blinkit': ['BLINKIT*', 'GROFERS*', 'ZOMATO BLINKIT'],
  'zepto': ['ZEPTO*', 'KIRANAKART*'],
  
  // Entertainment
  'netflix': ['NETFLIX*', 'NETFLIX.COM'],
  'spotify': ['SPOTIFY*', 'SPOTIFY AB'],
  'hotstar': ['HOTSTAR*', 'DISNEY+HOTSTAR'],
  
  // Utilities
  'airtel': ['AIRTEL*', 'BHARTI AIRTEL', 'AIRTEL PAYMENT'],
  'jio': ['JIO*', 'RELIANCE JIO', 'JIO FIBER'],
  
  // UPI Apps
  'phonepe': ['PHONEPE*', 'PHONEPE PVT'],
  'paytm': ['PAYTM*', 'ONE97*', 'PAYTM PAYMENT'],
  'gpay': ['GOOGLE*PAY', 'GOOGLE PAY', 'GPY*']
};

// Normalize merchant name
const normalizeMerchant = (description) => {
  const upperDesc = description.toUpperCase();
  
  // Check learned patterns first
  if (learnedPatterns.merchantMappings[upperDesc]) {
    return learnedPatterns.merchantMappings[upperDesc];
  }
  
  // Check standard normalizations
  for (const [normalized, patterns] of Object.entries(MERCHANT_NORMALIZATIONS)) {
    if (patterns.some(p => upperDesc.includes(p.replace('*', '')))) {
      return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    }
  }
  
  // Clean up the description
  let cleaned = description
    .replace(/\*+/g, ' ')                    // Remove asterisks
    .replace(/\d{10,}/g, '')                 // Remove long numbers (phone/account)
    .replace(/[A-Z]{2}\d{6,}/g, '')          // Remove reference numbers
    .replace(/UPI[-\/]?\d+/gi, '')           // Remove UPI refs
    .replace(/IMPS[-\/]?\d+/gi, '')          // Remove IMPS refs
    .replace(/NEFT[-\/]?\d+/gi, '')          // Remove NEFT refs
    .replace(/\s{2,}/g, ' ')                 // Collapse spaces
    .trim();
  
  // Capitalize properly
  if (cleaned.length > 3) {
    cleaned = cleaned.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  
  return cleaned || description;
};

const detectCategory = (description) => {
  const lowerDesc = description.toLowerCase();
  
  // Check user corrections first
  const normalized = normalizeMerchant(description).toLowerCase();
  if (learnedPatterns.categoryCorrections[normalized]) {
    return learnedPatterns.categoryCorrections[normalized];
  }
  
  // Check custom patterns
  for (const pattern of learnedPatterns.customPatterns) {
    if (lowerDesc.includes(pattern.keyword.toLowerCase())) {
      return pattern.category;
    }
  }
  
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lowerDesc.includes(kw))) {
      return category;
    }
  }
  
  return 'Other';
};

const parseDate = (dateStr, format) => {
  try {
    // Handle various date formats
    const cleanDate = dateStr.trim();
    
    // Month name mapping
    const months = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
      'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
      'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };
    
    let day, month, year;
    
    // Try different patterns
    // DD-MMM-YYYY or DD MMM YYYY (e.g., 15-Jan-2024, 15 Jan 2024)
    const monthNameMatch = cleanDate.match(/(\d{1,2})[-\s]?([A-Za-z]{3})[-\s]?(\d{2,4})/i);
    if (monthNameMatch) {
      day = monthNameMatch[1].padStart(2, '0');
      month = months[monthNameMatch[2].toLowerCase()] || '01';
      year = monthNameMatch[3];
      if (year.length === 2) {
        year = parseInt(year) > 50 ? '19' + year : '20' + year;
      }
      return `${year}-${month}-${day}`;
    }
    
    // Standard numeric formats
    const parts = cleanDate.split(/[-\/\s]+/);
    
    if (format.startsWith('DD')) {
      [day, month, year] = parts;
    } else if (format.startsWith('MM')) {
      [month, day, year] = parts;
    } else if (format.startsWith('YYYY')) {
      [year, month, day] = parts;
    } else {
      [day, month, year] = parts;
    }
    
    // Handle 2-digit year
    if (year && year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    
    // Validate and return
    if (day && month && year) {
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    return new Date().toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
};

const detectBank = (text) => {
  for (const [bankName, patterns] of Object.entries(BANK_PATTERNS)) {
    if (patterns.identifier.test(text)) {
      return { name: bankName, patterns };
    }
  }
  return null;
};

// Extract amount with confidence scoring
const extractAmount = (amountStr) => {
  try {
    // Remove currency symbols and normalize
    let cleaned = amountStr
      .replace(/[₹$€£]/g, '')
      .replace(/INR/gi, '')
      .replace(/Rs\.?/gi, '')
      .replace(/,/g, '')
      .trim();
    
    const amount = parseFloat(cleaned);
    
    // Confidence check - reasonable expense amounts
    if (amount > 0 && amount < 10000000) {
      return {
        amount,
        confidence: amount < 100000 ? 'high' : 'medium'
      };
    }
    return null;
  } catch (e) {
    return null;
  }
};

// ENHANCED Generic PDF text extraction with multiple strategies
const parseGenericStatement = (text) => {
  const transactions = [];
  const lines = text.split('\n');
  
  // Multiple extraction strategies
  const strategies = [
    // Strategy 1: Standard date-description-amount
    {
      pattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+(.{5,60}?)\s+([\d,]+\.?\d{0,2})\s*(?:Dr|CR|DB|Debit)?/gi,
      extract: (m) => ({ date: m[1], description: m[2], amount: m[3] })
    },
    // Strategy 2: Amount first
    {
      pattern: /([\d,]+\.\d{2})\s+(.{5,60}?)\s+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/gi,
      extract: (m) => ({ date: m[3], description: m[2], amount: m[1] })
    },
    // Strategy 3: Date with month name
    {
      pattern: /(\d{1,2}[-\s][A-Z]{3}[-\s]\d{2,4})\s+(.{5,60}?)\s+([\d,]+\.?\d{0,2})/gi,
      extract: (m) => ({ date: m[1], description: m[2], amount: m[3] })
    },
    // Strategy 4: Tab-separated (common in CSV-like PDFs)
    {
      pattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\t+(.+?)\t+([\d,]+\.?\d{0,2})/g,
      extract: (m) => ({ date: m[1], description: m[2], amount: m[3] })
    },
    // Strategy 5: UPI format
    {
      pattern: /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s+UPI[-\/]([A-Za-z0-9\s]+?)[-\/]\d+\s+([\d,]+\.?\d{0,2})/gi,
      extract: (m) => ({ date: m[1], description: 'UPI ' + m[2], amount: m[3] })
    }
  ];
  
  // Try each strategy
  for (const strategy of strategies) {
    for (const line of lines) {
      strategy.pattern.lastIndex = 0;
      const match = strategy.pattern.exec(line);
      
      if (match) {
        const extracted = strategy.extract(match);
        const amountResult = extractAmount(extracted.amount);
        
        if (amountResult) {
          transactions.push({
            date: parseDate(extracted.date, 'DD/MM/YYYY'),
            description: extracted.description.trim(),
            normalizedMerchant: normalizeMerchant(extracted.description),
            amount: amountResult.amount,
            category: detectCategory(extracted.description),
            confidence: amountResult.confidence,
            source: 'PDF Statement'
          });
        }
      }
    }
  }
  
  // Remove duplicates
  const unique = [];
  for (const txn of transactions) {
    const isDuplicate = unique.some(u => 
      u.date === txn.date && 
      Math.abs(u.amount - txn.amount) < 0.01 &&
      u.normalizedMerchant === txn.normalizedMerchant
    );
    if (!isDuplicate) {
      unique.push(txn);
    }
  }
  
  return unique;
};

// Main PDF parsing function - ENHANCED
export const parsePDFStatement = async (buffer) => {
  try {
    // Parse PDF to text
    const data = await pdf(buffer);
    const text = data.text;
    
    console.log('PDF parsed, text length:', text.length);
    
    // Detect bank
    const bank = detectBank(text);
    const transactions = [];
    const parseWarnings = [];
    
    if (bank) {
      console.log(`Detected bank: ${bank.name}`);
      
      // Track bank parsing stats
      if (!learnedPatterns.parsingStats.bankStats[bank.name]) {
        learnedPatterns.parsingStats.bankStats[bank.name] = { attempts: 0, success: 0 };
      }
      learnedPatterns.parsingStats.bankStats[bank.name].attempts++;
      
      // Try all patterns for this bank
      for (const pattern of bank.patterns.transactionPatterns) {
        const dateFormat = bank.patterns.dateFormats[0];
        let match;
        
        pattern.lastIndex = 0;
        while ((match = pattern.exec(text)) !== null) {
          const [, date, description, amount, type] = match;
          const amountResult = extractAmount(amount);
          
          // Skip credits/deposits
          if (type && (type.toLowerCase() === 'cr' || type.toLowerCase() === 'credit')) {
            continue;
          }
          
          if (amountResult) {
            transactions.push({
              date: parseDate(date, dateFormat),
              description: description.trim(),
              normalizedMerchant: normalizeMerchant(description),
              amount: amountResult.amount,
              category: detectCategory(description),
              confidence: amountResult.confidence,
              source: `PDF (${bank.name})`
            });
          }
        }
      }
      
      if (transactions.length >= 3) {
        learnedPatterns.parsingStats.bankStats[bank.name].success++;
      }
    }
    
    // If bank-specific parsing didn't work well, try generic
    if (transactions.length < 3) {
      console.log('Falling back to generic parsing');
      parseWarnings.push('Bank-specific patterns matched few transactions, using generic parser');
      
      const genericTxns = parseGenericStatement(text);
      if (genericTxns.length > transactions.length) {
        // Update stats
        learnedPatterns.parsingStats.totalParsed += genericTxns.length;
        saveLearnedPatterns();
        
        return {
          success: true,
          bank: bank?.name || 'Unknown',
          parsed: genericTxns,
          count: genericTxns.length,
          rawTextLength: text.length,
          warnings: parseWarnings,
          categories: summarizeCategories(genericTxns),
          dateRange: getDateRange(genericTxns)
        };
      }
    }
    
    // Remove duplicates from final list
    const uniqueTransactions = removeDuplicates(transactions);
    
    // Update stats
    learnedPatterns.parsingStats.totalParsed += uniqueTransactions.length;
    saveLearnedPatterns();
    
    return {
      success: true,
      bank: bank?.name || 'Unknown',
      parsed: uniqueTransactions,
      count: uniqueTransactions.length,
      rawTextLength: text.length,
      warnings: parseWarnings,
      categories: summarizeCategories(uniqueTransactions),
      dateRange: getDateRange(uniqueTransactions)
    };
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    return {
      success: false,
      error: error.message,
      parsed: [],
      suggestions: [
        'Ensure the PDF is a valid bank statement',
        'Try a clearer scan if the PDF is scanned',
        'Password-protected PDFs may not parse correctly'
      ]
    };
  }
};

// Helper: Remove duplicates
const removeDuplicates = (transactions) => {
  const unique = [];
  for (const txn of transactions) {
    const isDuplicate = unique.some(u => 
      u.date === txn.date && 
      Math.abs(u.amount - txn.amount) < 0.01 &&
      u.normalizedMerchant === txn.normalizedMerchant
    );
    if (!isDuplicate) {
      unique.push(txn);
    }
  }
  return unique;
};

// Helper: Summarize categories
const summarizeCategories = (transactions) => {
  const summary = {};
  for (const txn of transactions) {
    summary[txn.category] = (summary[txn.category] || 0) + txn.amount;
  }
  return summary;
};

// Helper: Get date range
const getDateRange = (transactions) => {
  if (transactions.length === 0) return null;
  const dates = transactions.map(t => t.date).sort();
  return {
    from: dates[0],
    to: dates[dates.length - 1]
  };
};

// Extract account summary from PDF - ENHANCED
export const extractAccountSummary = async (buffer) => {
  try {
    const data = await pdf(buffer);
    const text = data.text;
    
    const summary = {
      accountNumber: null,
      accountHolder: null,
      statementPeriod: null,
      openingBalance: null,
      closingBalance: null,
      totalDebits: null,
      totalCredits: null,
      bank: null
    };
    
    // Detect bank
    const bank = detectBank(text);
    if (bank) summary.bank = bank.name;
    
    // Account number patterns (multiple formats)
    const accPatterns = [
      /(?:Account|A\/c)\s*(?:No|Number)?[:\s]*(\d{10,18})/i,
      /(?:Account|A\/c)[:\s]*(\*+\d{4})/i,  // Masked: ****1234
      /(?:Account|A\/c)\s*#?\s*(\d{10,18})/i
    ];
    for (const pattern of accPatterns) {
      const match = text.match(pattern);
      if (match) {
        summary.accountNumber = match[1];
        break;
      }
    }
    
    // Account holder name
    const nameMatch = text.match(/(?:Account\s*Holder|Name)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i);
    if (nameMatch) summary.accountHolder = nameMatch[1];
    
    // Statement period (multiple formats)
    const periodPatterns = [
      /(?:Statement\s*Period|From)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
      /(?:Period)[:\s]*(\d{1,2}\s*[A-Z]{3}\s*\d{2,4})\s*(?:to|-)\s*(\d{1,2}\s*[A-Z]{3}\s*\d{2,4})/i
    ];
    for (const pattern of periodPatterns) {
      const match = text.match(pattern);
      if (match) {
        summary.statementPeriod = {
          from: parseDate(match[1], 'DD/MM/YYYY'),
          to: parseDate(match[2], 'DD/MM/YYYY')
        };
        break;
      }
    }
    
    // Balances
    const openingMatch = text.match(/Opening\s*Balance[:\s]*([\d,]+\.\d{2})/i);
    if (openingMatch) summary.openingBalance = parseFloat(openingMatch[1].replace(/,/g, ''));
    
    const closingMatch = text.match(/Closing\s*Balance[:\s]*([\d,]+\.\d{2})/i);
    if (closingMatch) summary.closingBalance = parseFloat(closingMatch[1].replace(/,/g, ''));
    
    // Totals
    const debitMatch = text.match(/Total\s*(?:Debit|Withdrawal|DR)[:\s]*([\d,]+\.\d{2})/i);
    if (debitMatch) summary.totalDebits = parseFloat(debitMatch[1].replace(/,/g, ''));
    
    const creditMatch = text.match(/Total\s*(?:Credit|Deposit|CR)[:\s]*([\d,]+\.\d{2})/i);
    if (creditMatch) summary.totalCredits = parseFloat(creditMatch[1].replace(/,/g, ''));
    
    return summary;
    
  } catch (error) {
    console.error('Summary extraction error:', error);
    return null;
  }
};

// LEARNING FUNCTIONS - Allow system to improve from corrections

// Learn a category correction
export const learnCategoryCorrection = (merchantName, correctCategory) => {
  const normalized = normalizeMerchant(merchantName).toLowerCase();
  learnedPatterns.categoryCorrections[normalized] = correctCategory;
  learnedPatterns.parsingStats.correctionsMade++;
  saveLearnedPatterns();
  
  console.log(`Learned: ${normalized} -> ${correctCategory}`);
  return true;
};

// Learn a merchant mapping
export const learnMerchantMapping = (rawDescription, normalizedName) => {
  learnedPatterns.merchantMappings[rawDescription.toUpperCase()] = normalizedName;
  saveLearnedPatterns();
  
  console.log(`Learned merchant: ${rawDescription} -> ${normalizedName}`);
  return true;
};

// Add a custom keyword-category pattern
export const addCustomPattern = (keyword, category) => {
  learnedPatterns.customPatterns.push({ keyword, category, addedAt: new Date().toISOString() });
  saveLearnedPatterns();
  
  console.log(`Added custom pattern: ${keyword} -> ${category}`);
  return true;
};

// Get parsing statistics
export const getParsingStats = () => {
  return {
    ...learnedPatterns.parsingStats,
    learnedMerchants: Object.keys(learnedPatterns.merchantMappings).length,
    categoryCorrections: Object.keys(learnedPatterns.categoryCorrections).length,
    customPatterns: learnedPatterns.customPatterns.length
  };
};

// Re-categorize a transaction (for user corrections)
export const recategorizeTransaction = (transaction, newCategory) => {
  // Learn from this correction
  learnCategoryCorrection(transaction.normalizedMerchant || transaction.description, newCategory);
  
  return {
    ...transaction,
    category: newCategory,
    recategorized: true
  };
};

export default { 
  parsePDFStatement, 
  extractAccountSummary,
  learnCategoryCorrection,
  learnMerchantMapping,
  addCustomPattern,
  getParsingStats,
  recategorizeTransaction
};
