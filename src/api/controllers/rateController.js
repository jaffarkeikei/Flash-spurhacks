const { logger } = require('../../utils/logger');
const { APIError } = require('../middleware/errorHandler');

// Sample exchange rate data - in a production system, this would come from real-time APIs
const SAMPLE_RATES = {
  'USD-EUR': 0.91,
  'USD-CAD': 1.35,
  'USD-GBP': 0.78,
  'EUR-USD': 1.10,
  'EUR-GBP': 0.86,
  'CAD-USD': 0.74,
  'GBP-USD': 1.28,
  'USDC-USDT': 1.0,
  'USDT-USDC': 1.0,
  'USDC-USD': 1.0,
  'USDT-USD': 1.0,
  'USD-USDC': 1.0,
  'USD-USDT': 1.0
};

// List of supported currencies
const SUPPORTED_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', type: 'fiat' },
  { code: 'EUR', name: 'Euro', type: 'fiat' },
  { code: 'GBP', name: 'British Pound', type: 'fiat' },
  { code: 'CAD', name: 'Canadian Dollar', type: 'fiat' },
  { code: 'USDC', name: 'USD Coin', type: 'crypto' },
  { code: 'USDT', name: 'Tether', type: 'crypto' },
  { code: 'APT', name: 'Aptos Token', type: 'crypto' }
];

/**
 * Get current exchange rates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getCurrentRates = async (req, res, next) => {
  try {
    const { sourceCurrency, targetCurrency } = req.query;
    
    logger.debug('Getting current rates', { sourceCurrency, targetCurrency });
    
    let rates = {};
    
    // If both source and target are provided, return just that pair
    if (sourceCurrency && targetCurrency) {
      const rate = getRate(sourceCurrency, targetCurrency);
      rates[`${sourceCurrency}-${targetCurrency}`] = rate;
    }
    // If only source is provided, return all rates for that source
    else if (sourceCurrency) {
      rates = getRatesForCurrency(sourceCurrency);
    }
    // If only target is provided, return all rates for that target
    else if (targetCurrency) {
      rates = getRatesForCurrency(null, targetCurrency);
    }
    // Otherwise return all rates
    else {
      rates = SAMPLE_RATES;
    }
    
    res.status(200).json({
      success: true,
      data: {
        rates,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get specific exchange rate
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSpecificRate = async (req, res, next) => {
  try {
    const { sourceCurrency, targetCurrency } = req.params;
    
    logger.debug('Getting specific rate', { sourceCurrency, targetCurrency });
    
    const rate = getRate(sourceCurrency, targetCurrency);
    
    res.status(200).json({
      success: true,
      data: {
        sourceCurrency,
        targetCurrency,
        rate,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get historical exchange rates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getRateHistory = async (req, res, next) => {
  try {
    const { sourceCurrency, targetCurrency, startDate, endDate } = req.query;
    
    logger.debug('Getting rate history', { 
      sourceCurrency, 
      targetCurrency, 
      startDate, 
      endDate 
    });
    
    // In a real implementation, this would query historical data from a database
    // For now, we'll generate some dummy data
    
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Generate one data point per day
    const dataPoints = [];
    const currentRate = getRate(sourceCurrency, targetCurrency);
    
    let currentDate = new Date(start);
    while (currentDate <= end) {
      // Add some random fluctuation to the rate for demo purposes
      const fluctuation = (Math.random() - 0.5) * 0.02; // +/- 1%
      const rate = currentRate * (1 + fluctuation);
      
      dataPoints.push({
        date: new Date(currentDate).toISOString(),
        rate: parseFloat(rate.toFixed(6))
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    res.status(200).json({
      success: true,
      data: {
        sourceCurrency,
        targetCurrency,
        history: dataPoints
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get list of supported currencies
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getSupportedCurrencies = async (req, res, next) => {
  try {
    logger.debug('Getting supported currencies');
    
    res.status(200).json({
      success: true,
      data: {
        currencies: SUPPORTED_CURRENCIES
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get exchange rate between two currencies
 * @param {string} sourceCurrency - Source currency code
 * @param {string} targetCurrency - Target currency code
 * @returns {number} Exchange rate
 */
const getRate = (sourceCurrency, targetCurrency) => {
  // Check if currencies are supported
  const sourceSupported = SUPPORTED_CURRENCIES.some(c => c.code === sourceCurrency);
  const targetSupported = SUPPORTED_CURRENCIES.some(c => c.code === targetCurrency);
  
  if (!sourceSupported || !targetSupported) {
    throw new APIError(`Unsupported currency pair: ${sourceCurrency}-${targetCurrency}`, 400);
  }
  
  // Check for direct rate
  const directPair = `${sourceCurrency}-${targetCurrency}`;
  if (SAMPLE_RATES[directPair]) {
    return SAMPLE_RATES[directPair];
  }
  
  // Check for inverse rate
  const inversePair = `${targetCurrency}-${sourceCurrency}`;
  if (SAMPLE_RATES[inversePair]) {
    return 1 / SAMPLE_RATES[inversePair];
  }
  
  // Try to calculate via USD if direct rate not available
  if (sourceCurrency !== 'USD' && targetCurrency !== 'USD') {
    const sourceToUsd = getRate(sourceCurrency, 'USD');
    const usdToTarget = getRate('USD', targetCurrency);
    return sourceToUsd * usdToTarget;
  }
  
  // Default fallback
  return 1.0;
};

/**
 * Get all rates for a specific currency
 * @param {string} sourceCurrency - Source currency code
 * @param {string} targetCurrency - Target currency code
 * @returns {Object} Exchange rates
 */
const getRatesForCurrency = (sourceCurrency, targetCurrency) => {
  const rates = {};
  
  if (sourceCurrency) {
    // Get all rates where this currency is the source
    SUPPORTED_CURRENCIES.forEach(currency => {
      if (currency.code !== sourceCurrency) {
        const rate = getRate(sourceCurrency, currency.code);
        rates[`${sourceCurrency}-${currency.code}`] = rate;
      }
    });
  } else if (targetCurrency) {
    // Get all rates where this currency is the target
    SUPPORTED_CURRENCIES.forEach(currency => {
      if (currency.code !== targetCurrency) {
        const rate = getRate(currency.code, targetCurrency);
        rates[`${currency.code}-${targetCurrency}`] = rate;
      }
    });
  }
  
  return rates;
};

module.exports = {
  getCurrentRates,
  getSpecificRate,
  getRateHistory,
  getSupportedCurrencies
}; 