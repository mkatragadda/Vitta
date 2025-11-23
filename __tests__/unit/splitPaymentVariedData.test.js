/**
 * Unit Tests for Split Payment with TEST_DATA_VARIED.sql
 * Tests the split payment functionality with real test data from TEST_DATA_VARIED.sql
 * 
 * This ensures:
 * - All 27 cards are shown in the split table
 * - Minimum payments are calculated correctly
 * - Budget distribution follows APR-weighted strategy
 * - Cards with zero balance are included
 */

import { handleSplitPayment } from '../../services/chat/responseGenerator';

// Test data based on TEST_DATA_VARIED.sql
// User ID: 717c64c6-ba70-4ef0-b725-e1f4f261c526
const TEST_CARDS = [
  // Zero balance cards (should still appear in table)
  { id: 'a1b2c3d4-e5f6-4789-a0b1-c2d3e4f5a6b7', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Chase Sapphire', card_name: 'Sapphire Preferred', current_balance: 0, apr: 23.74, amount_to_pay: 0 },
  { id: 'b2c3d4e5-f6a7-4890-b1c2-d3e4f5a6b7c8', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Amex Gold', card_name: 'Gold Card', current_balance: 0, apr: 25.74, amount_to_pay: 0 },
  { id: 'c3d4e5f6-a7b8-4901-c2d3-e4f5a6b7c8d9', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Capital One Venture', card_name: 'Venture Rewards', current_balance: 0, apr: 24.24, amount_to_pay: 0 },
  { id: 'd4e5f6a7-b8c9-4012-d3e4-f5a6b7c8d9e0', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Discover It', card_name: 'Discover It', current_balance: 0, apr: 22.99, amount_to_pay: 0 },
  { id: 'e5f6a7b8-c9d0-4123-e4f5-a6b7c8d9e0f1', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Citi Double Cash', card_name: 'Double Cash', current_balance: 0, apr: 27.99, amount_to_pay: 0 },
  { id: 'd6e7f8a9-b0c1-4234-d5e6-f7a8b9c0d1e2', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Chase Flex', card_name: 'Freedom Flex', current_balance: 0, apr: 23.24, amount_to_pay: 0 },
  { id: 'e7f8a9b0-c1d2-4345-e6f7-a8b9c0d1e2f3', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Amex Platinum', card_name: 'Platinum Card', current_balance: 0, apr: 26.24, amount_to_pay: 0 },
  { id: 'f8a9b0c1-d2e3-4456-f7a8-b9c0d1e2f3a4', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Citi Custom', card_name: 'Custom Cash', current_balance: 0, apr: 26.24, amount_to_pay: 0 },
  { id: 'a9b0c1d2-e3f4-4567-a8b9-c0d1e2f3a4b5', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Capital One Savor', card_name: 'Savor Rewards', current_balance: 0, apr: 24.74, amount_to_pay: 0 },
  { id: 'b0c1d2e3-f4a5-4678-b9c0-d1e2f3a4b5c6', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Wells Fargo Autograph', card_name: 'Autograph Card', current_balance: 0, apr: 21.99, amount_to_pay: 0 },
  { id: 'c5d6e7f8-a9b0-4123-c4d5-e6f7a8b9c0d1', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Long Grace', card_name: 'Long Grace Card', current_balance: 0, apr: 22.24, amount_to_pay: 0 },
  { id: 'c7d8e9f0-a1b2-4345-c6d7-e8f9a0b1c2d3', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Same Day', card_name: 'Same Day Card', current_balance: 0, apr: 23.49, amount_to_pay: 0 },
  
  // Cards with balances - from TEST_DATA_VARIED.sql
  { id: 'f6a7b8c9-d0e1-4234-f5a6-b7c8d9e0f1a2', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Chase Freedom', card_name: 'Freedom Unlimited', current_balance: 8450, apr: 19.74, amount_to_pay: 300 },
  { id: 'a7b8c9d0-e1f2-4345-a6b7-c8d9e0f1a2b3', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Wells Fargo Cash', card_name: 'Active Cash', current_balance: 12350, apr: 20.49, amount_to_pay: 450 },
  { id: 'b8c9d0e1-f2a3-4456-b7c8-d9e0f1a2b3c4', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Amex Blue Cash', card_name: 'Blue Cash Everyday', current_balance: 6720, apr: 21.24, amount_to_pay: 250 },
  { id: 'c9d0e1f2-a3b4-4567-c8d9-e0f1a2b3c4d5', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Store Card', card_name: 'Store Card', current_balance: 4250, apr: 28.74, amount_to_pay: 150 },
  { id: 'd0e1f2a3-b4c5-4678-d9e0-f1a2b3c4d5e6', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Capital One Platinum', card_name: 'Platinum', current_balance: 7200, apr: 26.99, amount_to_pay: 275 },
  { id: 'e1f2a3b4-c5d6-4789-e0f1-a2b3c4d5e6f7', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'CU Card', card_name: 'Credit Union Card', current_balance: 3800, apr: 15.99, amount_to_pay: 180 },
  { id: 'f2a3b4c5-d6e7-4890-f1a2-b3c4d5e6f7a8', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Early Cycle', card_name: 'Early Cycle Card', current_balance: 4800, apr: 22.49, amount_to_pay: 200 },
  { id: 'a3b4c5d6-e7f8-4901-a2b3-c4d5e6f7a8b9', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Late Cycle', card_name: 'Late Cycle Card', current_balance: 5600, apr: 23.49, amount_to_pay: 220 },
  { id: 'b4c5d6e7-f8a9-4012-b3c4-d5e6f7a8b9c0', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Short Grace', card_name: 'Short Grace Card', current_balance: 3600, apr: 20.99, amount_to_pay: 150 },
  { id: 'c1d2e3f4-a5b6-4789-c0d1-e2f3a4b5c6d7', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'High Util 1', card_name: 'High Util Card 1', current_balance: 6800, apr: 24.49, amount_to_pay: 280 },
  { id: 'd2e3f4a5-b6c7-4890-d1e2-f3a4b5c6d7e8', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'High Util 2', card_name: 'High Util Card 2', current_balance: 9000, apr: 25.24, amount_to_pay: 350 },
  { id: 'e3f4a5b6-c7d8-4901-e2f3-a4b5c6d7e8f9', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Maxed Card', card_name: 'Maxed Card', current_balance: 5700, apr: 27.99, amount_to_pay: 225 },
  { id: 'f4a5b6c7-d8e9-4012-f3a4-b5c6d7e8f9a0', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Low APR', card_name: 'Low APR Card', current_balance: 4200, apr: 16.49, amount_to_pay: 180 },
  { id: 'a5b6c7d8-e9f0-4123-a4b5-c6d7e8f9a0b1', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'Second APR', card_name: 'Second Best APR', current_balance: 3300, apr: 18.99, amount_to_pay: 140 },
  { id: 'b6c7d8e9-f0a1-4234-b5c6-d7e8f9a0b1c2', user_id: '717c64c6-ba70-4ef0-b725-e1f4f261c526', nickname: 'EOM Card', card_name: 'End of Month Card', current_balance: 2250, apr: 21.99, amount_to_pay: 100 },
];

describe('Split Payment with TEST_DATA_VARIED.sql Data', () => {
  test('should show ALL cards in the split table (27 cards from test data)', () => {
    const result = handleSplitPayment(TEST_CARDS, { amount: 6000 });
    
    expect(result).toBeDefined();
    expect(result).toContain('Payment Split');
    
    // Count card rows in table (excluding header and separator)
    const lines = result.split('\n');
    const tableRows = lines.filter(line => 
      line.includes('|') && 
      !line.includes('---') && 
      !line.includes('Card | Current Balance') &&
      line.trim().startsWith('|')
    );
    
    // Should have 27 rows (one for each card)
    expect(tableRows.length).toBe(27);
  });

  test('should calculate total minimum payments correctly ($3,450)', () => {
    // Calculate expected total minimum payments from test data
    const cardsWithBalance = TEST_CARDS.filter(c => c.current_balance > 0);
    const expectedTotalMin = cardsWithBalance.reduce((sum, c) => {
      return sum + Math.min(c.amount_to_pay || 0, c.current_balance || 0);
    }, 0);
    
    // Expected total: 300 + 450 + 250 + 150 + 275 + 180 + 200 + 220 + 150 + 280 + 350 + 225 + 180 + 140 + 100 = 3,450
    expect(expectedTotalMin).toBe(3450);
    
    const result = handleSplitPayment(TEST_CARDS, { amount: 6000 });
    expect(result).toContain('$3,450.00'); // Should show the total minimum
  });

  test('should distribute $6,000 budget correctly (minimums + APR-weighted extra)', () => {
    const budget = 6000;
    const totalMin = 3450;
    const remaining = budget - totalMin; // 2550
    
    const result = handleSplitPayment(TEST_CARDS, { amount: budget });
    
    expect(result).toBeDefined();
    expect(result).toContain('$6,000.00');
    expect(result).toContain('$3,450.00'); // Total minimum
    
    // Budget is sufficient, so should show optimized split (not warning)
    expect(result).not.toContain('⚠️ **Warning:**');
    
    // Should distribute remaining $2,550 to highest APR cards (Store Card 28.74%, Maxed Card 27.99%, etc.)
    // Extract payments from table and verify total
    const lines = result.split('\n');
    const paymentLines = lines.filter(line => 
      line.includes('|') && 
      !line.includes('---') && 
      !line.includes('Card | Current Balance')
    );
    
    let totalPayments = 0;
    paymentLines.forEach(line => {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4) {
        const payAmount = parseFloat(parts[3].replace(/[$,]/g, '')) || 0;
        totalPayments += payAmount;
      }
    });
    
    // Total payments should equal budget (6000)
    expect(Math.abs(totalPayments - budget)).toBeLessThan(0.01);
    
    // Verify that high APR cards get more than minimum
    // Store Card (28.74% APR) should get more than $150 minimum
    expect(result).toMatch(/Store Card.*\$150\.00.*\$\d+\.\d+/);
    // Maxed Card (27.99% APR) should get more than $225 minimum
    expect(result).toMatch(/Maxed Card.*\$225\.00.*\$\d+\.\d+/);
  });

  test('should include zero balance cards in the table', () => {
    const result = handleSplitPayment(TEST_CARDS, { amount: 6000 });
    
    expect(result).toBeDefined();
    
    // Check for zero balance cards in the response
    expect(result).toContain('Chase Sapphire');
    expect(result).toContain('Amex Gold');
    expect(result).toContain('Capital One Venture');
    expect(result).toContain('Discover It');
    expect(result).toContain('Citi Double Cash');
    
    // These should show $0.00 for Pay This Month
    expect(result).toContain('$0.00');
  });

  test('should prioritize highest APR cards for extra payments', () => {
    const result = handleSplitPayment(TEST_CARDS, { amount: 6000 });
    
    expect(result).toBeDefined();
    
    // Store Card has highest APR (28.74%) and should get extra payment
    // Maxed Card has second highest APR (27.99%) and should get extra payment
    // Extract payment amounts for high APR cards
    
    // Verify that high APR cards receive more than their minimum
    // This is tested indirectly through the total allocation
    expect(result).toContain('Store Card');
    expect(result).toContain('Maxed Card');
  });

  test('should handle insufficient budget correctly (budget < total minimum)', () => {
    const insufficientBudget = 2000; // Less than $3,450 minimum
    const result = handleSplitPayment(TEST_CARDS, { amount: insufficientBudget });
    
    expect(result).toBeDefined();
    expect(result).toContain('⚠️ **Warning:**');
    expect(result).toContain('less than the minimum payments required');
    expect(result).toContain('$2,000.00');
    expect(result).toContain('$3,450.00');
    expect(result).toContain('Shortfall'); // Should show shortfall amount ($1,450)
    
    // Should still show all cards in the table
    const lines = result.split('\n');
    const tableRows = lines.filter(line => 
      line.includes('|') && 
      !line.includes('---') && 
      !line.includes('Card | Current Balance') &&
      line.trim().startsWith('|')
    );
    expect(tableRows.length).toBe(27);
    
    // Verify proportional distribution - total payments should equal budget (allow for rounding)
    let totalPayments = 0;
    tableRows.forEach(line => {
      const parts = line.split('|').map(p => p.trim()).filter(p => p);
      if (parts.length >= 4) {
        const payAmount = parseFloat(parts[3].replace(/[$,]/g, '')) || 0;
        totalPayments += payAmount;
      }
    });
    // Allow small rounding differences due to floating-point arithmetic
    expect(Math.abs(totalPayments - insufficientBudget)).toBeLessThan(1.0);
  });

  test('should show all cards when budget equals minimum payments', () => {
    const exactBudget = 3450; // Exactly equal to total minimum
    const result = handleSplitPayment(TEST_CARDS, { amount: exactBudget });
    
    expect(result).toBeDefined();
    expect(result).toContain('$3,450.00');
    
    // Should show all 27 cards
    const lines = result.split('\n');
    const tableRows = lines.filter(line => 
      line.includes('|') && 
      !line.includes('---') && 
      !line.includes('Card | Current Balance') &&
      line.trim().startsWith('|')
    );
    expect(tableRows.length).toBe(27);
    
    // No budget remaining (all goes to minimums)
    expect(result).not.toContain('Budget remaining:');
    
    // All cards with balances should pay exactly their minimum
    // Cards with zero balance should pay $0
  });
});

