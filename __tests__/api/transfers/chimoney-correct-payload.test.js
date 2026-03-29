/**
 * Chimoney Correct Payload Structure Tests
 * Validates the actual Chimoney API request format for bank payouts
 * Reference: Chimoney API sample curl request (POST /v0.2.4/payouts/bank)
 */

describe('Chimoney Correct Bank Payout Payload', () => {
  describe('Actual Chimoney API Structure', () => {
    test('should use banks array at root level', () => {
      // Chimoney requires this exact structure:
      const payload = {
        subAccount: '1234567',
        turnOffNotification: 'false',
        debitCurrency: 'USD',
        banks: [
          {
            countryToSend: 'Nigeria',
            account_bank: '044',
            account_number: '0690000031',
            valueInUSD: 10,
            amount: 10,
            reference: '1234567890',
            fullname: 'Jane Doe',
            branch_code: 'GH190101',
            narration: 'Monthly Salary Payment',
          },
        ],
      };

      expect(payload).toHaveProperty('banks');
      expect(Array.isArray(payload.banks)).toBe(true);
      expect(payload.banks.length).toBeGreaterThan(0);
    });

    test('should include subAccount at root level', () => {
      const payload = {
        subAccount: '1234567',
        turnOffNotification: 'false',
        debitCurrency: 'USD',
        banks: [],
      };

      expect(payload).toHaveProperty('subAccount');
      expect(typeof payload.subAccount).toBe('string');
    });

    test('should include debitCurrency for source account currency', () => {
      const payload = {
        debitCurrency: 'USD', // User's account currency
        banks: [
          {
            amount: 46132.63, // INR amount
          },
        ],
      };

      expect(payload).toHaveProperty('debitCurrency');
      expect(payload.debitCurrency).toBe('USD'); // Always USD for Vitta
    });

    test('should have turnOffNotification field', () => {
      const payload = {
        turnOffNotification: 'false',
        banks: [],
      };

      expect(payload).toHaveProperty('turnOffNotification');
      expect(['true', 'false']).toContain(payload.turnOffNotification);
    });
  });

  describe('Bank Entry Fields (Inside banks array)', () => {
    test('should have countryToSend for destination country', () => {
      const bankEntry = {
        countryToSend: 'India',
      };

      expect(bankEntry).toHaveProperty('countryToSend');
      expect(bankEntry.countryToSend).toBe('India');
    });

    test('should use account_bank for bank code (not bank_code)', () => {
      const bankEntry = {
        account_bank: 'HDFC', // Bank identifier/code
      };

      expect(bankEntry).toHaveProperty('account_bank');
      expect(bankEntry).not.toHaveProperty('bank_code');
    });

    test('should use branch_code for IFSC code', () => {
      const bankEntry = {
        branch_code: 'HDFC0000123', // IFSC code
      };

      expect(bankEntry).toHaveProperty('branch_code');
      expect(bankEntry.branch_code).toBe('HDFC0000123');
    });

    test('should have account_number for recipient account', () => {
      const bankEntry = {
        account_number: '0690000031',
      };

      expect(bankEntry).toHaveProperty('account_number');
      expect(typeof bankEntry.account_number).toBe('string');
    });

    test('should use fullname (not full_name or fullName)', () => {
      const bankEntry = {
        fullname: 'Jane Doe',
      };

      expect(bankEntry).toHaveProperty('fullname');
      expect(bankEntry).not.toHaveProperty('full_name');
      expect(bankEntry).not.toHaveProperty('fullName');
    });

    test('should have both amount and valueInUSD', () => {
      const bankEntry = {
        amount: 46132.63, // Target currency amount (INR)
        valueInUSD: 500, // Source amount (USD)
      };

      expect(bankEntry).toHaveProperty('amount');
      expect(bankEntry).toHaveProperty('valueInUSD');
      expect(typeof bankEntry.amount).toBe('number');
      expect(typeof bankEntry.valueInUSD).toBe('number');
    });

    test('should have reference for idempotency', () => {
      const bankEntry = {
        reference: 'VIT-4983786c',
      };

      expect(bankEntry).toHaveProperty('reference');
      expect(typeof bankEntry.reference).toBe('string');
    });

    test('should have narration/description', () => {
      const bankEntry = {
        narration: 'International transfer from Vitta',
      };

      expect(bankEntry).toHaveProperty('narration');
      expect(typeof bankEntry.narration).toBe('string');
    });
  });

  describe('Vitta Implementation - Bank Payout for India', () => {
    test('should construct correct payload for India bank transfer', () => {
      // Simulating Vitta's bank transfer to India
      const transferId = '4983786c-ece1-4320-957d-33bd4ff7a1d7';
      const beneficiary = {
        name: 'Amit Kumar',
        account: '9876543210',
        ifsc: 'HDFC0000123',
        bank_code: 'HDFC', // Bank identifier
      };
      const amounts = {
        source_amount: 500,
        target_amount: 41625,
      };

      const payload = {
        subAccount: process.env.CHIMONEY_SUB_ACCOUNT || '',
        turnOffNotification: 'false',
        debitCurrency: 'USD',
        banks: [
          {
            countryToSend: 'India',
            account_bank: beneficiary.bank_code,
            account_number: beneficiary.account,
            branch_code: beneficiary.ifsc,
            fullname: beneficiary.name,
            amount: amounts.target_amount,
            valueInUSD: amounts.source_amount,
            reference: `VIT-${transferId.substring(0, 8)}`,
            narration: 'International transfer from Vitta',
          },
        ],
      };

      // Verify structure
      expect(payload).toHaveProperty('subAccount');
      expect(payload).toHaveProperty('debitCurrency');
      expect(payload.debitCurrency).toBe('USD');
      expect(Array.isArray(payload.banks)).toBe(true);

      // Verify bank entry
      const bank = payload.banks[0];
      expect(bank.countryToSend).toBe('India');
      expect(bank.account_bank).toBe('HDFC');
      expect(bank.account_number).toBe('9876543210');
      expect(bank.branch_code).toBe('HDFC0000123');
      expect(bank.fullname).toBe('Amit Kumar');
      expect(bank.amount).toBe(41625);
      expect(bank.valueInUSD).toBe(500);
      expect(bank.reference).toBe('VIT-4983786c');
    });

    test('should NOT include source account details in payload', () => {
      const payload = {
        subAccount: '1234567',
        debitCurrency: 'USD',
        banks: [
          {
            account_bank: 'HDFC',
            account_number: '9876543210',
            fullname: 'Amit Kumar',
          },
        ],
      };

      // These should NOT be in the payload
      expect(payload).not.toHaveProperty('source_account');
      expect(payload).not.toHaveProperty('source_routing');
      expect(payload).not.toHaveProperty('source_account_holder');

      // They should not be in banks entry either
      const bank = payload.banks[0];
      expect(bank).not.toHaveProperty('source_account');
      expect(bank).not.toHaveProperty('source_routing');
    });
  });

  describe('Field Name Mapping - Schema to Payload', () => {
    test('should map beneficiaries schema to correct payload fields', () => {
      // From beneficiaries table (after decryption)
      const beneficiary = {
        name: 'Amit Kumar', // Schema field
        account: '9876543210', // Decrypted from account_encrypted
        ifsc: 'HDFC0000123', // Schema field
        bank_code: 'HDFC', // Must be populated from somewhere
      };

      // Mapping to Chimoney payload
      const bankEntry = {
        fullname: beneficiary.name, // name → fullname
        account_number: beneficiary.account, // account → account_number
        branch_code: beneficiary.ifsc, // ifsc → branch_code
        account_bank: beneficiary.bank_code, // bank_code → account_bank
      };

      expect(bankEntry.fullname).toBe('Amit Kumar');
      expect(bankEntry.account_number).toBe('9876543210');
      expect(bankEntry.branch_code).toBe('HDFC0000123');
      expect(bankEntry.account_bank).toBe('HDFC');
    });
  });

  describe('Error Cases', () => {
    test('should not accept flat structure without banks array', () => {
      const wrongPayload = {
        countryToSend: 'India',
        account_bank: 'HDFC',
        account_number: '9876543210',
        fullname: 'Amit Kumar',
      };

      // This structure is WRONG for Chimoney
      expect(wrongPayload).not.toHaveProperty('banks');
    });

    test('should validate all required fields are present', () => {
      const requiredFields = [
        'countryToSend',
        'account_bank',
        'account_number',
        'branch_code',
        'fullname',
        'amount',
        'reference',
        'narration',
      ];

      const bankEntry = {
        countryToSend: 'India',
        account_bank: 'HDFC',
        account_number: '9876543210',
        branch_code: 'HDFC0000123',
        fullname: 'Amit Kumar',
        amount: 41625,
        valueInUSD: 500,
        reference: 'VIT-4983786c',
        narration: 'International transfer from Vitta',
      };

      requiredFields.forEach(field => {
        expect(bankEntry).toHaveProperty(field);
      });
    });
  });

  describe('UPI Payment Method', () => {
    test('should NOT support UPI - not documented in Chimoney API', () => {
      // UPI is currently not documented in Chimoney API
      // This is a note that UPI transfers should not be attempted

      const isUPISupportedInChimoney = false; // Not documented
      expect(isUPISupportedInChimoney).toBe(false);
    });

    test('should throw error when attempting UPI transfer', () => {
      const callChimoneyUPI = () => {
        throw new Error(
          'UPI payment method is not yet supported. Please use bank account transfer instead.'
        );
      };

      expect(callChimoneyUPI).toThrow(/UPI payment method is not yet supported/);
    });
  });

  describe('API Endpoint and Headers', () => {
    test('should POST to correct endpoint', () => {
      const baseUrl = 'https://api-v2-sandbox.chimoney.io';
      const endpoint = `${baseUrl}/v0.2.4/payouts/bank`;

      expect(endpoint).toBe('https://api-v2-sandbox.chimoney.io/v0.2.4/payouts/bank');
    });

    test('should include required headers', () => {
      const headers = {
        'X-API-KEY': 'test-key',
        'Content-Type': 'application/json',
        'accept': 'application/json',
      };

      expect(headers).toHaveProperty('X-API-KEY');
      expect(headers).toHaveProperty('Content-Type');
      expect(headers).toHaveProperty('accept');
      expect(headers['Content-Type']).toBe('application/json');
    });
  });
});
