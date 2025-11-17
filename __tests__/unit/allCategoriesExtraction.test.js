/**
 * Comprehensive Tests for All 14 Category Extraction
 * Tests category extraction for all categories in the reward structure system
 */

import { extractEntities } from '../../services/chat/entityExtractor';

describe('Category Extraction - All 14 Categories', () => {
  
  // 1. Dining
  describe('Dining Category', () => {
    test('extracts "dining" from "best card for dining"', () => {
      const entities = extractEntities('best card for dining');
      expect(entities.category).toBe('dining');
    });

    test('extracts "dining" from "restaurant" keyword', () => {
      const entities = extractEntities('which card for restaurant');
      expect(entities.category).toBe('dining');
    });

    test('extracts "dining" from "eating out"', () => {
      const entities = extractEntities('best card for eating out');
      expect(entities.category).toBe('dining');
    });

    test('extracts "dining" from "takeout"', () => {
      const entities = extractEntities('card for takeout');
      expect(entities.category).toBe('dining');
    });
  });

  // 2. Groceries
  describe('Groceries Category', () => {
    test('extracts "groceries" from "best card for groceries"', () => {
      const entities = extractEntities('best card for groceries');
      expect(entities.category).toBe('groceries');
    });

    test('extracts "groceries" from "grocery store"', () => {
      const entities = extractEntities('which card for grocery store');
      expect(entities.category).toBe('groceries');
    });

    test('extracts "groceries" from "supermarket"', () => {
      const entities = extractEntities('best card for supermarket');
      expect(entities.category).toBe('groceries');
    });

    test('extracts "groceries" from "food shopping" (not dining)', () => {
      // "food shopping" should match groceries, not dining
      const entities = extractEntities('card for food shopping');
      expect(entities.category).toBe('groceries');
      // Verify it's not matching "food" from dining category
      expect(entities.category).not.toBe('dining');
    });
  });

  // 3. Gas
  describe('Gas Category', () => {
    test('extracts "gas" from "best card for gas"', () => {
      const entities = extractEntities('best card for gas');
      expect(entities.category).toBe('gas');
    });

    test('extracts "gas" from "gas station"', () => {
      const entities = extractEntities('which card for gas station');
      expect(entities.category).toBe('gas');
    });

    test('extracts "gas" from "fuel"', () => {
      const entities = extractEntities('best card for fuel');
      expect(entities.category).toBe('gas');
    });

    test('extracts "gas" from "ev charging"', () => {
      const entities = extractEntities('card for ev charging');
      expect(entities.category).toBe('gas');
    });
  });

  // 4. Travel
  describe('Travel Category', () => {
    test('extracts "travel" from "best card for travel"', () => {
      const entities = extractEntities('best card for travel');
      expect(entities.category).toBe('travel');
    });

    test('extracts "travel" from "flight"', () => {
      const entities = extractEntities('which card for flight');
      expect(entities.category).toBe('travel');
    });

    test('extracts "travel" from "hotel"', () => {
      const entities = extractEntities('best card for hotel');
      expect(entities.category).toBe('travel');
    });

    test('extracts "travel" from "vacation"', () => {
      const entities = extractEntities('card for vacation');
      expect(entities.category).toBe('travel');
    });

    test('extracts "travel" from "airbnb"', () => {
      const entities = extractEntities('best card for airbnb');
      expect(entities.category).toBe('travel');
    });

    test('extracts "travel" from "cruise"', () => {
      const entities = extractEntities('card for cruise');
      expect(entities.category).toBe('travel');
    });
  });

  // 5. Entertainment
  describe('Entertainment Category', () => {
    test('extracts "entertainment" from "best card for entertainment"', () => {
      const entities = extractEntities('best card for entertainment');
      expect(entities.category).toBe('entertainment');
    });

    test('extracts "entertainment" from "movies"', () => {
      const entities = extractEntities('which card for movies');
      expect(entities.category).toBe('entertainment');
    });

    test('extracts "entertainment" from "concert"', () => {
      const entities = extractEntities('best card for concert');
      expect(entities.category).toBe('entertainment');
    });

    test('extracts "entertainment" from "theater"', () => {
      const entities = extractEntities('card for theater');
      expect(entities.category).toBe('entertainment');
    });

    test('extracts "entertainment" from "event tickets"', () => {
      const entities = extractEntities('best card for event tickets');
      expect(entities.category).toBe('entertainment');
    });
  });

  // 6. Streaming
  describe('Streaming Category', () => {
    test('extracts "streaming" from "best card for streaming"', () => {
      const entities = extractEntities('best card for streaming');
      expect(entities.category).toBe('streaming');
    });

    test('extracts "streaming" from "streaming services"', () => {
      const entities = extractEntities('which card for streaming services');
      expect(entities.category).toBe('streaming');
    });

    test('extracts "streaming" from "subscriptions"', () => {
      const entities = extractEntities('best card for subscriptions');
      expect(entities.category).toBe('streaming');
    });

    test('extracts "streaming" from "netflix"', () => {
      const entities = extractEntities('card for netflix');
      expect(entities.category).toBe('streaming');
    });

    test('extracts "streaming" from "spotify"', () => {
      const entities = extractEntities('best card for spotify');
      expect(entities.category).toBe('streaming');
    });

    test('extracts "streaming" from "disney plus"', () => {
      const entities = extractEntities('card for disney plus');
      expect(entities.category).toBe('streaming');
    });
  });

  // 7. Drugstores
  describe('Drugstores Category', () => {
    test('extracts "drugstores" from "best card for drugstores"', () => {
      const entities = extractEntities('best card for drugstores');
      expect(entities.category).toBe('drugstores');
    });

    test('extracts "drugstores" from "pharmacy"', () => {
      const entities = extractEntities('which card for pharmacy');
      expect(entities.category).toBe('drugstores');
    });

    test('extracts "drugstores" from "cvs"', () => {
      const entities = extractEntities('best card for cvs');
      expect(entities.category).toBe('drugstores');
    });

    test('extracts "drugstores" from "walgreens"', () => {
      const entities = extractEntities('card for walgreens');
      expect(entities.category).toBe('drugstores');
    });

    test('extracts "drugstores" from "drug store"', () => {
      const entities = extractEntities('best card for drug store');
      expect(entities.category).toBe('drugstores');
    });
  });

  // 8. Home Improvement
  describe('Home Improvement Category', () => {
    test('extracts "home_improvement" from "best card for home improvement"', () => {
      const entities = extractEntities('best card for home improvement');
      expect(entities.category).toBe('home_improvement');
    });

    test('extracts "home_improvement" from "hardware"', () => {
      const entities = extractEntities('which card for hardware');
      expect(entities.category).toBe('home_improvement');
    });

    test('extracts "home_improvement" from "home depot"', () => {
      const entities = extractEntities('best card for home depot');
      expect(entities.category).toBe('home_improvement');
    });

    test('extracts "home_improvement" from "lowes"', () => {
      const entities = extractEntities('card for lowes');
      expect(entities.category).toBe('home_improvement');
    });

    test('extracts "home_improvement" from "hardware store"', () => {
      const entities = extractEntities('best card for hardware store');
      expect(entities.category).toBe('home_improvement');
    });
  });

  // 9. Department Stores
  describe('Department Stores Category', () => {
    test('extracts "department_stores" from "best card for department store"', () => {
      const entities = extractEntities('best card for department store');
      expect(entities.category).toBe('department_stores');
    });

    test('extracts "department_stores" from "shopping"', () => {
      const entities = extractEntities('which card for shopping');
      expect(entities.category).toBe('department_stores');
    });

    test('extracts "department_stores" from "shopping mall"', () => {
      const entities = extractEntities('best card for shopping mall');
      expect(entities.category).toBe('department_stores');
    });

    test('extracts "department_stores" from "mall"', () => {
      const entities = extractEntities('card for mall');
      expect(entities.category).toBe('department_stores');
    });

    test('extracts "department_stores" from "retail store"', () => {
      const entities = extractEntities('best card for retail store');
      expect(entities.category).toBe('department_stores');
    });
  });

  // 10. Transit
  describe('Transit Category', () => {
    test('extracts "transit" from "best card for transit"', () => {
      const entities = extractEntities('best card for transit');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "public transit"', () => {
      const entities = extractEntities('which card for public transit');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "uber"', () => {
      const entities = extractEntities('best card for uber');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "lyft"', () => {
      const entities = extractEntities('card for lyft');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "taxi"', () => {
      const entities = extractEntities('best card for taxi');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "rideshare"', () => {
      const entities = extractEntities('card for rideshare');
      expect(entities.category).toBe('transit');
    });

    test('extracts "transit" from "subway"', () => {
      const entities = extractEntities('best card for subway');
      expect(entities.category).toBe('transit');
    });
  });

  // 11. Utilities
  describe('Utilities Category', () => {
    test('extracts "utilities" from "best card for utilities"', () => {
      const entities = extractEntities('best card for utilities');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "electricity"', () => {
      const entities = extractEntities('which card for electricity');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "electric bill"', () => {
      const entities = extractEntities('best card for electric bill');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "water bill"', () => {
      const entities = extractEntities('card for water bill');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "internet bill"', () => {
      const entities = extractEntities('best card for internet bill');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "phone bill"', () => {
      const entities = extractEntities('card for phone bill');
      expect(entities.category).toBe('utilities');
    });

    test('extracts "utilities" from "cable bill"', () => {
      const entities = extractEntities('best card for cable bill');
      expect(entities.category).toBe('utilities');
    });
  });

  // 12. Warehouse
  describe('Warehouse Category', () => {
    test('extracts "warehouse" from "best card for warehouse"', () => {
      const entities = extractEntities('best card for warehouse');
      expect(entities.category).toBe('warehouse');
    });

    test('extracts "warehouse" from "warehouse club"', () => {
      const entities = extractEntities('which card for warehouse club');
      expect(entities.category).toBe('warehouse');
    });

    test('extracts "warehouse" from "costco" (should NOT extract as merchant when used as category)', () => {
      const entities = extractEntities('best card for costco purchases');
      // Costco should be extracted as warehouse category, not merchant
      // But since costco is a specific merchant, it might be both
      // Let's verify category is warehouse
      expect(entities.category).toBe('warehouse');
    });

    test('extracts "warehouse" from "sams club"', () => {
      const entities = extractEntities('card for sams club');
      expect(entities.category).toBe('warehouse');
    });

    test('extracts "warehouse" from "wholesale club"', () => {
      const entities = extractEntities('best card for wholesale club');
      expect(entities.category).toBe('warehouse');
    });
  });

  // 13. Office Supplies
  describe('Office Supplies Category', () => {
    test('extracts "office_supplies" from "best card for office supplies"', () => {
      const entities = extractEntities('best card for office supplies');
      expect(entities.category).toBe('office_supplies');
    });

    test('extracts "office_supplies" from "office supply"', () => {
      const entities = extractEntities('which card for office supply');
      expect(entities.category).toBe('office_supplies');
    });

    test('extracts "office_supplies" from "office depot"', () => {
      const entities = extractEntities('best card for office depot');
      expect(entities.category).toBe('office_supplies');
    });

    test('extracts "office_supplies" from "staples"', () => {
      const entities = extractEntities('card for staples');
      expect(entities.category).toBe('office_supplies');
    });

    test('extracts "office_supplies" from "stationery"', () => {
      const entities = extractEntities('best card for stationery');
      expect(entities.category).toBe('office_supplies');
    });
  });

  // 14. Insurance
  describe('Insurance Category', () => {
    test('extracts "insurance" from "best card for insurance"', () => {
      const entities = extractEntities('best card for insurance');
      expect(entities.category).toBe('insurance');
    });

    test('extracts "insurance" from "auto insurance"', () => {
      const entities = extractEntities('which card for auto insurance');
      expect(entities.category).toBe('insurance');
    });

    test('extracts "insurance" from "car insurance"', () => {
      const entities = extractEntities('best card for car insurance');
      expect(entities.category).toBe('insurance');
    });

    test('extracts "insurance" from "health insurance"', () => {
      const entities = extractEntities('card for health insurance');
      expect(entities.category).toBe('insurance');
    });

    test('extracts "insurance" from "home insurance"', () => {
      const entities = extractEntities('best card for home insurance');
      expect(entities.category).toBe('insurance');
    });

    test('extracts "insurance" from "life insurance"', () => {
      const entities = extractEntities('card for life insurance');
      expect(entities.category).toBe('insurance');
    });
  });

  // Edge cases and variations
  describe('Category Extraction - Edge Cases', () => {
    test('handles "best card for" prefix for all categories', () => {
      // Test with spaces for multi-word categories
      const categoryTests = [
        { query: 'dining', expected: 'dining' },
        { query: 'groceries', expected: 'groceries' },
        { query: 'gas', expected: 'gas' },
        { query: 'travel', expected: 'travel' },
        { query: 'entertainment', expected: 'entertainment' },
        { query: 'streaming', expected: 'streaming' },
        { query: 'drugstores', expected: 'drugstores' },
        { query: 'home improvement', expected: 'home_improvement' }, // space in query, underscore in category
        { query: 'department stores', expected: 'department_stores' }, // space in query, underscore in category
        { query: 'transit', expected: 'transit' },
        { query: 'utilities', expected: 'utilities' },
        { query: 'warehouse', expected: 'warehouse' },
        { query: 'office supplies', expected: 'office_supplies' }, // space in query, underscore in category
        { query: 'insurance', expected: 'insurance' }
      ];

      categoryTests.forEach(({ query, expected }) => {
        const entities = extractEntities(`best card for ${query}`);
        expect(entities.category).toBe(expected);
      });
    });

    test('handles "which card for" prefix', () => {
      const entities = extractEntities('which card for dining');
      expect(entities.category).toBe('dining');
    });

    test('handles "suggest card for" prefix', () => {
      const entities = extractEntities('suggest card for travel');
      expect(entities.category).toBe('travel');
    });

    test('handles category with amount', () => {
      const entities = extractEntities('best card for $500 dining');
      expect(entities.category).toBe('dining');
      expect(entities.amount).toBe(500);
    });

    test('handles multiple category mentions (should use first match)', () => {
      const entities = extractEntities('best card for dining and travel');
      // Should match first category found
      expect(entities.category).toBeTruthy();
    });
  });

  // Category precedence tests
  describe('Category Precedence', () => {
    test('category takes precedence over merchant when both exist', () => {
      const entities = extractEntities('best card for travel at costco');
      expect(entities.category).toBe('travel');
      // Costco might still be merchant, but category should be travel
    });

    test('longer category phrases match correctly', () => {
      const entities = extractEntities('best card for home improvement store');
      expect(entities.category).toBe('home_improvement');
    });

    test('case insensitive matching', () => {
      const entities = extractEntities('BEST CARD FOR DINING');
      expect(entities.category).toBe('dining');
    });
  });
});

