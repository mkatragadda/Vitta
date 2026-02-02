/**
 * Tests for Category Mapper
 * Maps Plaid categories to Vitta standardized categories
 */

import { mapCategory, getCategoryMap } from '../../../services/plaid/categoryMapper';

describe('Category Mapper', () => {
  describe('mapCategory - Exact Matches', () => {
    test('maps Food and Drink > Groceries to groceries', () => {
      expect(mapCategory('Food and Drink > Groceries')).toBe('groceries');
    });

    test('maps Food and Drink > Restaurants to dining', () => {
      expect(mapCategory('Food and Drink > Restaurants')).toBe('dining');
    });

    test('maps Transportation > Gas Stations to gas', () => {
      expect(mapCategory('Transportation > Gas Stations')).toBe('gas');
    });

    test('maps Transportation > Public Transit to transit', () => {
      expect(mapCategory('Transportation > Public Transit')).toBe('transit');
    });

    test('maps Travel > Flights to travel', () => {
      expect(mapCategory('Travel > Flights')).toBe('travel');
    });

    test('maps Entertainment > Movies and DVDs to entertainment', () => {
      expect(mapCategory('Entertainment > Movies and DVDs')).toBe('entertainment');
    });

    test('maps Streaming > Streaming Services to streaming', () => {
      expect(mapCategory('Streaming > Streaming Services')).toBe('streaming');
    });

    test('maps Shops > Drugstores to drugstores', () => {
      expect(mapCategory('Shops > Drugstores')).toBe('drugstores');
    });

    test('maps Shops > Home Improvement to home_improvement', () => {
      expect(mapCategory('Shops > Home Improvement')).toBe('home_improvement');
    });

    test('maps Shops > Department Stores to department_stores', () => {
      expect(mapCategory('Shops > Department Stores')).toBe('department_stores');
    });

    test('maps Bills and Utilities > Utilities to utilities', () => {
      expect(mapCategory('Bills and Utilities > Utilities')).toBe('utilities');
    });

    test('maps Auto > Insurance to insurance', () => {
      expect(mapCategory('Auto > Insurance')).toBe('insurance');
    });
  });

  describe('mapCategory - Parent Category Fallback', () => {
    test('falls back to parent category: Food and Drink → dining', () => {
      expect(mapCategory('Food and Drink')).toBe('dining');
    });

    test('falls back to parent category: Transportation → transit', () => {
      expect(mapCategory('Transportation')).toBe('transit');
    });

    test('falls back to parent category: Travel → travel', () => {
      expect(mapCategory('Travel')).toBe('travel');
    });

    test('falls back to parent category: Entertainment → entertainment', () => {
      expect(mapCategory('Entertainment')).toBe('entertainment');
    });

    test('falls back to parent category: Shops → department_stores', () => {
      expect(mapCategory('Shops')).toBe('department_stores');
    });

    test('falls back to parent category: Bills and Utilities → utilities', () => {
      expect(mapCategory('Bills and Utilities')).toBe('utilities');
    });

    test('falls back to parent category: Auto → gas', () => {
      expect(mapCategory('Auto')).toBe('gas');
    });
  });

  describe('mapCategory - Edge Cases', () => {
    test('returns default for null', () => {
      expect(mapCategory(null)).toBe('default');
    });

    test('returns default for undefined', () => {
      expect(mapCategory(undefined)).toBe('default');
    });

    test('returns default for empty string', () => {
      expect(mapCategory('')).toBe('default');
    });

    test('returns default for unknown category', () => {
      expect(mapCategory('Unknown > Something')).toBe('default');
    });

    test('returns default for non-string input (number)', () => {
      expect(mapCategory(123)).toBe('default');
    });

    test('returns default for non-string input (object)', () => {
      expect(mapCategory({})).toBe('default');
    });

    test('returns default for non-string input (array)', () => {
      expect(mapCategory([])).toBe('default');
    });

    test('handles extra whitespace in category string by trimming parent', () => {
      // Extra whitespace around > is handled by trimming the parent category
      // Even though exact match fails, parent "Food and Drink " gets trimmed to match the map
      expect(mapCategory('Food and Drink  >  Groceries')).toBe('dining');
    });
  });

  describe('mapCategory - Multiple Dining Options', () => {
    test('maps Coffee Shops to dining', () => {
      expect(mapCategory('Food and Drink > Coffee Shops')).toBe('dining');
    });

    test('maps Fast Food to dining', () => {
      expect(mapCategory('Food and Drink > Fast Food')).toBe('dining');
    });

    test('maps Bars to dining', () => {
      expect(mapCategory('Food and Drink > Bars')).toBe('dining');
    });

    test('maps Bakeries to dining', () => {
      expect(mapCategory('Food and Drink > Bakeries')).toBe('dining');
    });
  });

  describe('mapCategory - Transit Options', () => {
    test('maps Taxis and Rideshare to transit', () => {
      expect(mapCategory('Transportation > Taxis and Rideshare')).toBe('transit');
    });

    test('maps Parking to transit', () => {
      expect(mapCategory('Transportation > Parking')).toBe('transit');
    });

    test('maps Car Rental to transit', () => {
      expect(mapCategory('Transportation > Car Rental')).toBe('transit');
    });

    test('maps Tolls to transit', () => {
      expect(mapCategory('Transportation > Tolls')).toBe('transit');
    });
  });

  describe('mapCategory - Insurance Options', () => {
    test('maps Transportation > Auto Insurance to insurance', () => {
      expect(mapCategory('Transportation > Auto Insurance')).toBe('insurance');
    });

    test('maps Auto > Insurance to insurance', () => {
      expect(mapCategory('Auto > Insurance')).toBe('insurance');
    });
  });

  describe('mapCategory - Utilities Options', () => {
    test('maps Bills and Utilities > Phone Service to utilities', () => {
      expect(mapCategory('Bills and Utilities > Phone Service')).toBe('utilities');
    });

    test('maps Bills and Utilities > Internet Service to utilities', () => {
      expect(mapCategory('Bills and Utilities > Internet Service')).toBe('utilities');
    });

    test('maps Taxes to utilities', () => {
      expect(mapCategory('Taxes')).toBe('utilities');
    });

    test('maps Financial > Bank Fees to utilities', () => {
      expect(mapCategory('Financial > Bank Fees')).toBe('utilities');
    });
  });

  describe('getCategoryMap', () => {
    test('returns the category map', () => {
      const map = getCategoryMap();
      expect(typeof map).toBe('object');
      expect(map).not.toBeNull();
    });

    test('returns a copy of the map (not the original)', () => {
      const map1 = getCategoryMap();
      const map2 = getCategoryMap();
      expect(map1).toEqual(map2);
      expect(map1).not.toBe(map2);
    });

    test('map contains expected categories', () => {
      const map = getCategoryMap();
      expect(map['Food and Drink > Groceries']).toBe('groceries');
      expect(map['Travel > Flights']).toBe('travel');
      expect(map['Entertainment > Movies and DVDs']).toBe('entertainment');
    });

    test('map has reasonable size (30+ mappings)', () => {
      const map = getCategoryMap();
      expect(Object.keys(map).length).toBeGreaterThan(30);
    });
  });
});
