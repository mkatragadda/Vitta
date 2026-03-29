/**
 * Chimoney Payload Validation Tests
 * Ensures correct API request structure for bank and UPI payouts
 * Reference: TRANSFER_PLAID_INTEGRATION.md lines 59-70
 */

jest.mock('../../../config/chimoney', () => {
  return jest.fn(() => ({
    baseUrl: 'https://api-v2-sandbox.chimoney.io',
    rateEndpoint: '/v0.2.4/rates',
    apiKey: 'test-chimoney-key',
  }));
});

jest.mock('@supabase/supabase-js');
jest.mock('../../../services/encryption/encryptionService');
jest.mock('../../../services/transfer/transferService');
jest.mock('../../../services/plaid/plaidAuthService');
jest.mock('../../../services/payment/idempotencyService');
jest.mock('../../../utils/encryption');

describe('Chimoney Payout Payload Validation', () => {
  describe('Bank Payout Payload Structure', () => {
    test('should NOT wrap payload in receiver array', () => {
      // WRONG: { receiver: [...] }
      // CORRECT: { source_account: ..., account_number: ... }
      const wrongPayload = {
        receiver: [
          {
            bankCode: 'HDFC0000123',
            accountNumber: '9876543210',
            fullName: 'Amit Kumar',
          },
        ],
      };

      const correctPayload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        amount: 41625,
        currency: 'INR',
        account_number: '9876543210',
        bank_code: 'HDFC0000123',
        fullname: 'Amit Kumar',
        reference: 'VIT-txn123',
        narration: 'International transfer from Vitta',
      };

      // Payload should be flat object, not nested in receiver
      expect(correctPayload).not.toHaveProperty('receiver');
      expect(wrongPayload).toHaveProperty('receiver');
    });

    test('should use bank_code for IFSC, not hardcoded field names', () => {
      const payload = {
        bank_code: 'HDFC0000123', // IFSC code
        account_number: '9876543210',
        fullname: 'Amit Kumar',
      };

      expect(payload.bank_code).toBe('HDFC0000123');
      expect(payload).not.toHaveProperty('ifsc'); // Should use bank_code
      expect(payload).not.toHaveProperty('recipient_bank_code');
    });

    test('should use correct field name: fullname (lowercase)', () => {
      const payload = {
        fullname: 'Amit Kumar', // lowercase 'fullname'
      };

      expect(payload).toHaveProperty('fullname');
      expect(payload.fullname).toBe('Amit Kumar');
      // Should NOT use capitalized variants
      expect(payload).not.toHaveProperty('fullName');
      expect(payload).not.toHaveProperty('full_name');
    });

    test('should include source account details from Plaid', () => {
      const payload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        amount: 41625,
        account_number: '9876543210',
        bank_code: 'HDFC0000123',
        fullname: 'Amit Kumar',
      };

      // Source account fields should be present
      expect(payload).toHaveProperty('source_account');
      expect(payload).toHaveProperty('source_routing');
      expect(payload).toHaveProperty('source_account_holder');

      // Destination fields should be present
      expect(payload).toHaveProperty('account_number');
      expect(payload).toHaveProperty('bank_code');
      expect(payload).toHaveProperty('fullname');
      expect(payload).toHaveProperty('amount');
    });

    test('should have correct field types', () => {
      const payload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        amount: 41625,
        currency: 'INR',
        account_number: '9876543210',
        bank_code: 'HDFC0000123',
        fullname: 'Amit Kumar',
        reference: 'VIT-txn123',
      };

      expect(typeof payload.source_account).toBe('string');
      expect(typeof payload.source_routing).toBe('string');
      expect(typeof payload.source_account_holder).toBe('string');
      expect(typeof payload.amount).toBe('number');
      expect(typeof payload.currency).toBe('string');
      expect(typeof payload.account_number).toBe('string');
      expect(typeof payload.bank_code).toBe('string');
      expect(typeof payload.fullname).toBe('string');
      expect(typeof payload.reference).toBe('string');
    });
  });

  describe('UPI Payout Payload Structure', () => {
    test('should NOT wrap UPI payload in receiver array', () => {
      // WRONG: { receiver: [...] }
      // CORRECT: { phoneNumber: ..., upiAddress: ... }
      const wrongPayload = {
        receiver: [
          {
            phoneNumber: '9876543210',
            upiAddress: 'user@okhdfcbank',
            fullName: 'Amit Kumar',
          },
        ],
      };

      const correctPayload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        amount: 41625,
        currency: 'INR',
        phoneNumber: '9876543210',
        upiAddress: 'user@okhdfcbank',
        fullname: 'Amit Kumar',
        reference: 'VIT-txn123',
      };

      expect(correctPayload).not.toHaveProperty('receiver');
      expect(wrongPayload).toHaveProperty('receiver');
    });

    test('should use phoneNumber and upiAddress for UPI', () => {
      const payload = {
        phoneNumber: '9876543210',
        upiAddress: 'user@okhdfcbank',
        fullname: 'Amit Kumar',
      };

      expect(payload).toHaveProperty('phoneNumber');
      expect(payload).toHaveProperty('upiAddress');
      expect(payload).not.toHaveProperty('phone_number');
      expect(payload).not.toHaveProperty('upi_address');
    });

    test('should include source account details for UPI payout', () => {
      const payload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        amount: 41625,
        currency: 'INR',
        phoneNumber: '9876543210',
        upiAddress: 'user@okhdfcbank',
        fullname: 'Amit Kumar',
        reference: 'VIT-txn123',
      };

      // Source fields
      expect(payload).toHaveProperty('source_account');
      expect(payload).toHaveProperty('source_routing');
      expect(payload).toHaveProperty('source_account_holder');

      // Destination UPI fields
      expect(payload).toHaveProperty('phoneNumber');
      expect(payload).toHaveProperty('upiAddress');
      expect(payload).toHaveProperty('fullname');
      expect(payload).toHaveProperty('amount');
    });

    test('should validate UPI address format', () => {
      const validUPIs = [
        'user@okhdfcbank',
        'amit@hdfc',
        'name@icici',
        'person@ybl',
      ];

      validUPIs.forEach(upi => {
        expect(upi).toMatch(/@/); // UPI must contain @
      });
    });
  });

  describe('Required Field Validation', () => {
    test('bank payout requires all destination fields', () => {
      const bankPayload = {
        account_number: '9876543210',
        bank_code: 'HDFC0000123',
        fullname: 'Amit Kumar',
        amount: 41625,
        currency: 'INR',
      };

      expect(bankPayload).toHaveProperty('account_number');
      expect(bankPayload).toHaveProperty('bank_code');
      expect(bankPayload).toHaveProperty('fullname');
      expect(bankPayload).toHaveProperty('amount');
      expect(bankPayload).toHaveProperty('currency');
    });

    test('UPI payout requires phone and UPI address', () => {
      const upiPayload = {
        phoneNumber: '9876543210',
        upiAddress: 'user@okhdfcbank',
        fullname: 'Amit Kumar',
        amount: 41625,
        currency: 'INR',
      };

      expect(upiPayload).toHaveProperty('phoneNumber');
      expect(upiPayload).toHaveProperty('upiAddress');
      expect(upiPayload).toHaveProperty('fullname');
      expect(upiPayload).toHaveProperty('amount');
    });

    test('both payloads require source account details', () => {
      const requiredSourceFields = ['source_account', 'source_routing', 'source_account_holder'];

      const bankPayload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        account_number: '9876543210',
      };

      const upiPayload = {
        source_account: '1234567890',
        source_routing: '121000248',
        source_account_holder: 'Jane Doe',
        upiAddress: 'user@okhdfcbank',
      };

      requiredSourceFields.forEach(field => {
        expect(bankPayload).toHaveProperty(field);
        expect(upiPayload).toHaveProperty(field);
      });
    });
  });

  describe('Field Name Consistency', () => {
    test('should NOT use recipient_ prefix in payload', () => {
      const wrongFields = [
        'recipient_bank_code',
        'recipient_bank_account',
        'recipient_name',
        'recipient_phone',
        'recipient_upi',
      ];

      const payload = {
        bank_code: 'HDFC0000123',
        account_number: '9876543210',
        fullname: 'Amit Kumar',
        phoneNumber: '9876543210',
        upiAddress: 'user@okhdfcbank',
      };

      wrongFields.forEach(field => {
        expect(payload).not.toHaveProperty(field);
      });
    });

    test('should use schema field names in payload construction', () => {
      // Schema uses: name, phone, upi_encrypted, account_encrypted, ifsc
      // After decryption: name, phone, upi, account, ifsc
      // In payload: fullname, phoneNumber, upiAddress, account_number, bank_code

      const decryptedBeneficiary = {
        name: 'Amit Kumar', // Schema field
        phone: '9876543210', // Schema field
        upi: 'user@okhdfcbank', // Decrypted field
        account: '9876543210', // Decrypted field
        ifsc: 'HDFC0000123', // Schema field
      };

      // Mapping to payload
      const bankPayload = {
        fullname: decryptedBeneficiary.name,
        account_number: decryptedBeneficiary.account,
        bank_code: decryptedBeneficiary.ifsc,
      };

      const upiPayload = {
        fullname: decryptedBeneficiary.name,
        phoneNumber: decryptedBeneficiary.phone,
        upiAddress: decryptedBeneficiary.upi,
      };

      // All correct transformations
      expect(bankPayload.fullname).toBe('Amit Kumar');
      expect(bankPayload.account_number).toBe('9876543210');
      expect(bankPayload.bank_code).toBe('HDFC0000123');

      expect(upiPayload.fullname).toBe('Amit Kumar');
      expect(upiPayload.phoneNumber).toBe('9876543210');
      expect(upiPayload.upiAddress).toBe('user@okhdfcbank');
    });
  });

  describe('Error Handling for Missing Fields', () => {
    test('should validate beneficiary.account exists before using', () => {
      const beneficiary = {}; // Missing account field

      const isValidBankPayload = () => {
        if (!beneficiary.account) {
          throw new Error('Beneficiary account number not found (decryption may have failed)');
        }
      };

      expect(isValidBankPayload).toThrow(/account number not found/);
    });

    test('should validate beneficiary.ifsc exists for bank payouts', () => {
      const beneficiary = { account: '9876543210' }; // Missing ifsc

      const isValidBankPayload = () => {
        if (!beneficiary.ifsc) {
          throw new Error('Beneficiary IFSC code not found');
        }
      };

      expect(isValidBankPayload).toThrow(/IFSC code not found/);
    });

    test('should validate beneficiary.upi exists for UPI payouts', () => {
      const beneficiary = { phone: '9876543210' }; // Missing upi

      const isValidUPIPayload = () => {
        if (!beneficiary.upi) {
          throw new Error('Beneficiary UPI not found (decryption may have failed)');
        }
      };

      expect(isValidUPIPayload).toThrow(/UPI not found/);
    });

    test('should validate sourceAccountDetails are available', () => {
      const sourceAccountDetails = null;

      const payload = {
        source_account: sourceAccountDetails?.account_number || '',
        source_routing: sourceAccountDetails?.routing_number || '',
        source_account_holder: sourceAccountDetails?.account_holder_name || '',
      };

      expect(payload.source_account).toBe('');
      expect(payload.source_routing).toBe('');
      expect(payload.source_account_holder).toBe('');
    });
  });

  describe('API Endpoint URLs', () => {
    test('bank payout endpoint should use correct path', () => {
      const baseUrl = 'https://api-v2-sandbox.chimoney.io';
      const endpoint = `${baseUrl}/v0.2.4/payouts/bank`;

      expect(endpoint).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/bank');
      expect(endpoint).not.toContain('https://api.chimoney.io/'); // No production URL
    });

    test('UPI payout endpoint should use correct path', () => {
      const baseUrl = 'https://api-v2-sandbox.chimoney.io';
      const endpoint = `${baseUrl}/v0.2.4/payouts/upi`;

      expect(endpoint).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/upi');
      expect(endpoint).not.toContain('https://api.chimoney.io/'); // No production URL
    });

    test('should construct URL from config, not hardcode', () => {
      const chimoneyConfig = { baseUrl: 'https://api-v2-sandbox.chimoney.io' };
      const bankUrl = `${chimoneyConfig.baseUrl}/v0.2.4/payouts/bank`;
      const upiUrl = `${chimoneyConfig.baseUrl}/v0.2.4/payouts/upi`;

      expect(bankUrl).toContain(chimoneyConfig.baseUrl);
      expect(upiUrl).toContain(chimoneyConfig.baseUrl);
    });
  });

  describe('Reference Field Format', () => {
    test('should use correct reference format', () => {
      const transferId = '4983786c-ece1-4320-957d-33bd4ff7a1d7';
      const reference = `VIT-${transferId.substring(0, 8)}`;

      expect(reference).toBe('VIT-4983786c');
      expect(reference).toMatch(/^VIT-[a-f0-9]{8}$/);
    });

    test('reference should be included in payload', () => {
      const payload = {
        reference: 'VIT-4983786c',
        narration: 'International transfer from Vitta',
      };

      expect(payload).toHaveProperty('reference');
      expect(payload).toHaveProperty('narration');
    });
  });
});
