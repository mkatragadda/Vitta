/**
 * Text Extraction Utilities
 * Common functions for extracting structured data from natural language text
 * 
 * This module provides consistent extraction logic used across the application
 * to ensure uniform parsing of user input.
 */

/**
 * Extract monetary amount from text
 * 
 * Supports multiple formats:
 * - $5000, $5,000, $5,000.00
 * - 5000 dollars, 5,000 dollars
 * - 5k, 5.5k (thousand notation)
 * - Plain numbers: 5000, 5,000
 * 
 * @param {string} text - Text to extract amount from
 * @param {Object} options - Extraction options
 * @param {boolean} options.allowK - Allow "k" notation (e.g., 5k = 5000). Default: true
 * @param {number} options.minDigits - Minimum number of digits to match. Default: 1
 * @returns {number|null} Extracted amount or null if not found
 * 
 * @example
 * extractAmount("I have $5000") // 5000
 * extractAmount("budget is 5,000 dollars") // 5000
 * extractAmount("need 2.5k") // 2500
 */
export function extractAmount(text, options = {}) {
  const { allowK = true, minDigits = 1 } = options;

  if (!text || typeof text !== 'string') {
    return null;
  }

  const lowerText = text.toLowerCase();

  // Pattern 1: Dollar sign with amount ($5000, $5,000, $5,000.00)
  const dollarPattern = /\$\s*([\d,]+(?:\.\d{1,2})?)/i;
  let match = lowerText.match(dollarPattern);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return amount;
    }
  }

  // Pattern 2: "K" notation (5k, 2.5k)
  if (allowK) {
    const kPattern = /([\d.]+)\s*k\b/i;
    match = lowerText.match(kPattern);
    if (match) {
      const amount = parseFloat(match[1]) * 1000;
      if (!isNaN(amount) && amount > 0) {
        return amount;
      }
    }
  }

  // Pattern 3: Amount with "dollars" or "USD" (5000 dollars, 5,000 dollars)
  const currencyPattern = /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|bucks?)/i;
  match = lowerText.match(currencyPattern);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return amount;
    }
  }

  // Pattern 4: Plain number with optional commas (5000, 5,000)
  // Only match if it has minimum required digits
  const digitPattern = minDigits > 1 
    ? new RegExp(`\\b([\\d,]{${minDigits},})\\b`)
    : /\b([\d,]+(?:\.\d{1,2})?)\b/;
  
  match = lowerText.match(digitPattern);
  if (match) {
    const amount = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(amount) && amount > 0) {
      return amount;
    }
  }

  return null;
}

/**
 * Extract multiple amounts from text
 * 
 * @param {string} text - Text to extract amounts from
 * @param {Object} options - Extraction options (same as extractAmount)
 * @returns {number[]} Array of extracted amounts
 * 
 * @example
 * extractAllAmounts("Split $1000 on card A and $500 on card B") 
 * // [1000, 500]
 */
export function extractAllAmounts(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const amounts = [];
  const patterns = [
    /\$\s*([\d,]+(?:\.\d{1,2})?)/gi,
    /([\d,]+(?:\.\d{1,2})?)\s*(?:dollars?|usd|bucks?)/gi,
    /([\d.]+)\s*k\b/gi
  ];

  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern);
    while ((match = regex.exec(text)) !== null) {
      let amount = match[1].replace(/,/g, '');
      // Handle K notation
      if (text.toLowerCase().substring(match.index, match.index + 10).includes('k')) {
        amount = parseFloat(amount) * 1000;
      } else {
        amount = parseFloat(amount);
      }
      
      if (!isNaN(amount) && amount > 0 && !amounts.includes(amount)) {
        amounts.push(amount);
      }
    }
  });

  return amounts;
}

/**
 * Extract percentage from text
 * 
 * Supports formats: 25%, 25 percent, 0.25
 * 
 * @param {string} text - Text to extract percentage from
 * @returns {number|null} Percentage as decimal (e.g., 0.25 for 25%) or null
 * 
 * @example
 * extractPercentage("APR is 25%") // 0.25
 * extractPercentage("25 percent") // 0.25
 */
export function extractPercentage(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const lowerText = text.toLowerCase();

  // Pattern 1: Number with % sign (25%, 25.5%)
  let match = lowerText.match(/([\d.]+)\s*%/);
  if (match) {
    const percent = parseFloat(match[1]);
    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
      return percent / 100;
    }
  }

  // Pattern 2: Number with "percent" word (25 percent)
  match = lowerText.match(/([\d.]+)\s*percent/);
  if (match) {
    const percent = parseFloat(match[1]);
    if (!isNaN(percent) && percent >= 0 && percent <= 100) {
      return percent / 100;
    }
  }

  // Pattern 3: Decimal between 0 and 1 (0.25)
  match = lowerText.match(/\b(0\.\d+)\b/);
  if (match) {
    const decimal = parseFloat(match[1]);
    if (!isNaN(decimal) && decimal >= 0 && decimal <= 1) {
      return decimal;
    }
  }

  return null;
}

/**
 * Extract card name or identifier from text
 * 
 * @param {string} text - Text to extract card name from
 * @returns {string|null} Card identifier or null
 * 
 * @example
 * extractCardReference("use my Chase Sapphire card") // "chase sapphire"
 */
export function extractCardReference(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  const lowerText = text.toLowerCase();
  
  // Common card patterns
  const cardPatterns = [
    /(?:my\s+)?([a-z]+\s+[a-z]+)\s+card/i,  // "my chase sapphire card"
    /(?:the\s+)?([a-z]+\s+[a-z]+)/i,         // "the amex gold"
    /card\s+(?:ending\s+in\s+)?(\d{4})/i     // "card ending in 1234"
  ];

  for (const pattern of cardPatterns) {
    const match = lowerText.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

/**
 * Normalize text by removing extra spaces, lowercasing, etc.
 * 
 * @param {string} text - Text to normalize
 * @returns {string} Normalized text
 */
export function normalizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')  // Multiple spaces to single space
    .replace(/[^\w\s$.,%-]/g, '')  // Remove special chars except common ones
    .trim();
}

/**
 * Format amount for display
 * 
 * @param {number} amount - Amount to format
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeSymbol - Include $ symbol. Default: true
 * @param {number} options.decimals - Number of decimal places. Default: 2
 * @returns {string} Formatted amount
 * 
 * @example
 * formatAmount(5000) // "$5,000.00"
 * formatAmount(5000.5, { decimals: 0 }) // "$5,001"
 */
export function formatAmount(amount, options = {}) {
  const { includeSymbol = true, decimals = 2 } = options;
  
  if (typeof amount !== 'number' || isNaN(amount)) {
    return includeSymbol ? '$0.00' : '0.00';
  }

  const formatted = amount.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return includeSymbol ? `$${formatted}` : formatted;
}

export default {
  extractAmount,
  extractAllAmounts,
  extractPercentage,
  extractCardReference,
  normalizeText,
  formatAmount
};

