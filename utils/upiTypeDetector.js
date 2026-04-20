/**
 * UPI Type Detector
 * Automatically detects if a UPI payment is Person-to-Person (P2P) or Person-to-Merchant (P2M)
 * based on the QR code parameters
 */

/**
 * Determine if UPI payment is to a merchant or a person
 * @param {object} parsedUPI - Parsed UPI data from QR code
 * @param {string} parsedUPI.merchantCode - Merchant code (mc parameter) from QR
 * @param {string} parsedUPI.amount - Pre-filled amount
 * @param {string} parsedUPI.mode - QR mode (optional)
 * @param {string} parsedUPI.orgid - Organization ID (optional)
 * @returns {object} Payment type and recommended Wise purpose
 */
export function detectPaymentType(parsedUPI) {
  const { merchantCode, amount, mode, orgid } = parsedUPI;

  // Primary indicator: Merchant Code (mc parameter)
  // P2M transactions always have a 4-digit merchant category code
  // P2P transactions either lack this parameter or have '0000'
  const hasMerchantCode = merchantCode &&
                          merchantCode !== '0000' &&
                          merchantCode.trim() !== '';

  // Secondary indicators for merchant detection
  const hasStaticQRMode = mode === '02'; // Static merchant QR
  const hasOrgId = orgid && orgid.trim() !== ''; // Verified merchant account
  const hasPreFilledAmount = amount && parseFloat(amount) > 0; // Dynamic POS QR

  // Decision logic
  const isMerchantPayment = hasMerchantCode ||
                            hasOrgId ||
                            (hasStaticQRMode && hasPreFilledAmount);

  // Select appropriate Wise transfer purpose
  // For P2M: Use business/retail travel purpose for faster clearing
  // For P2P: Use family maintenance for instant transfer
  const transferPurpose = isMerchantPayment
    ? 'Business/Travel expenses - Retail purchase'
    : 'Sending money to family or friends';

  // Get merchant category name for additional context
  const merchantCategory = getMerchantCategory(merchantCode);

  return {
    paymentType: isMerchantPayment ? 'P2M' : 'P2P',
    transferPurpose,
    merchantCategory,
    detectionReasons: {
      merchantCode: Boolean(hasMerchantCode),
      staticQR: Boolean(hasStaticQRMode),
      organizationId: Boolean(hasOrgId),
      preFilledAmount: Boolean(hasPreFilledAmount),
    }
  };
}

/**
 * Get merchant category description from merchant code
 * Based on NPCI Merchant Category Codes (MCC)
 */
function getMerchantCategory(merchantCode) {
  if (!merchantCode || merchantCode === '0000') {
    return null;
  }

  const categoryMap = {
    '5411': 'Grocery Store',
    '5812': 'Restaurant/Dining',
    '5541': 'Service Station/Gas',
    '5311': 'Department Store',
    '5999': 'Miscellaneous Retail',
    '5814': 'Fast Food',
    '5912': 'Drug Store/Pharmacy',
    '5943': 'Stationery Store',
    '5661': 'Shoe Store',
    '5691': 'Clothing Store',
    '5732': 'Electronics Store',
    '5811': 'Caterer',
    '5813': 'Bar/Tavern',
    '7230': 'Beauty/Barber Shop',
    '7298': 'Health/Spa',
    '7997': 'Gym/Fitness',
    '8062': 'Hospital',
    '8011': 'Doctor',
    '8021': 'Dentist',
  };

  return categoryMap[merchantCode] || 'Merchant';
}

/**
 * Get Wise-compatible purpose code based on payment type
 * These codes are optimized for clearing speed in Wise's system
 */
export function getWisePurposeCode(paymentType) {
  // Note: Wise API uses descriptive strings, not codes
  // But internally these map to different clearing channels
  if (paymentType === 'P2M') {
    // For merchant payments, use business/travel purpose
    // This routes through faster commercial clearing channels
    return 'Business/Travel expenses - Retail purchase';
  } else {
    // For personal payments, use family maintenance
    // This uses instant P2P clearing (IMPS in India)
    return 'Sending money to family or friends';
  }
}

export default {
  detectPaymentType,
  getWisePurposeCode,
};
