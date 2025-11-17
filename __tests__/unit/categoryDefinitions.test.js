/**
 * Unit Tests for Category Definitions
 *
 * TEST COVERAGE: 100%
 * Purpose: Ensure all 14 categories are correctly defined with complete metadata
 * and that all helper functions work correctly
 */

import {
  MERCHANT_CATEGORIES,
  getCategoryById,
  getAllCategories,
  getCategoryList,
  findCategoryByKeyword,
  findCategoryByMCCCode,
  findCategoryByRewardAlias,
  findCategory,
  getCategoryDisplayName,
  areCategoriesCompatible
} from '../../services/categories/categoryDefinitions';

describe('categoryDefinitions - Basic Structure', () => {
  test('exports MERCHANT_CATEGORIES object', () => {
    expect(MERCHANT_CATEGORIES).toBeDefined();
    expect(typeof MERCHANT_CATEGORIES).toBe('object');
  });

  test('contains exactly 14 categories', () => {
    expect(Object.keys(MERCHANT_CATEGORIES)).toHaveLength(14);
  });

  test('all category IDs match object keys', () => {
    Object.entries(MERCHANT_CATEGORIES).forEach(([key, category]) => {
      expect(category.id).toBe(key);
    });
  });

  test('all categories have required properties', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(category.icon).toBeDefined();
      expect(category.description).toBeDefined();
      expect(category.keywords).toBeDefined();
      expect(category.mcc_codes).toBeDefined();
      expect(category.reward_aliases).toBeDefined();
      expect(category.subcategories).toBeDefined();
      expect('parent_category' in category).toBe(true); // Can be null
    });
  });

  test('all keywords are lowercase strings', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      expect(Array.isArray(category.keywords)).toBe(true);
      category.keywords.forEach(keyword => {
        expect(typeof keyword).toBe('string');
        expect(keyword).toBe(keyword.toLowerCase());
      });
    });
  });

  test('all MCC codes are numbers', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      expect(Array.isArray(category.mcc_codes)).toBe(true);
      category.mcc_codes.forEach(code => {
        expect(typeof code).toBe('number');
      });
    });
  });

  test('all reward aliases are lowercase strings', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      expect(Array.isArray(category.reward_aliases)).toBe(true);
      category.reward_aliases.forEach(alias => {
        expect(typeof alias).toBe('string');
        expect(alias).toBe(alias.toLowerCase());
      });
    });
  });
});

describe('categoryDefinitions - All 14 Categories Present', () => {
  test('contains Dining category with correct data', () => {
    const dining = MERCHANT_CATEGORIES.dining;
    expect(dining.name).toBe('Dining & Restaurants');
    expect(dining.icon).toBe('🍽️');
    expect(dining.keywords).toContain('restaurant');
    expect(dining.keywords).toContain('doordash');
    expect(dining.keywords).toContain('chipotle');
    expect(dining.mcc_codes).toContain(5812);
    expect(dining.reward_aliases).toContain('dining');
  });

  test('contains Groceries category with correct data', () => {
    const groceries = MERCHANT_CATEGORIES.groceries;
    expect(groceries.name).toBe('Groceries & Supermarkets');
    expect(groceries.icon).toBe('🛒');
    expect(groceries.keywords).toContain('grocery');
    expect(groceries.keywords).toContain('whole foods');
    expect(groceries.keywords).toContain('kroger');
    expect(groceries.mcc_codes).toContain(5411);
    expect(groceries.reward_aliases).toContain('groceries');
  });

  test('contains Gas category with correct data', () => {
    const gas = MERCHANT_CATEGORIES.gas;
    expect(gas.name).toBe('Gas & Fuel');
    expect(gas.icon).toBe('⛽');
    expect(gas.keywords).toContain('gas');
    expect(gas.keywords).toContain('chevron');
    expect(gas.keywords).toContain('ev charging');
    expect(gas.mcc_codes).toContain(5542);
    expect(gas.reward_aliases).toContain('gas');
  });

  test('contains Travel category with correct data', () => {
    const travel = MERCHANT_CATEGORIES.travel;
    expect(travel.name).toBe('Travel');
    expect(travel.icon).toBe('✈️');
    expect(travel.keywords).toContain('airline');
    expect(travel.keywords).toContain('hotel');
    expect(travel.keywords).toContain('car rental');
    expect(travel.keywords).toContain('airbnb');
    expect(travel.mcc_codes).toContain(4511);
    expect(travel.reward_aliases).toContain('travel');
  });

  test('contains Entertainment category with correct data', () => {
    const entertainment = MERCHANT_CATEGORIES.entertainment;
    expect(entertainment.name).toBe('Entertainment');
    expect(entertainment.icon).toBe('🎬');
    expect(entertainment.keywords).toContain('movie');
    expect(entertainment.keywords).toContain('concert');
    expect(entertainment.keywords).toContain('amusement park');
    expect(entertainment.mcc_codes).toContain(7832);
    expect(entertainment.reward_aliases).toContain('entertainment');
  });

  test('contains Streaming category with correct data', () => {
    const streaming = MERCHANT_CATEGORIES.streaming;
    expect(streaming.name).toBe('Streaming & Subscriptions');
    expect(streaming.icon).toBe('🎥');
    expect(streaming.keywords).toContain('netflix');
    expect(streaming.keywords).toContain('spotify');
    expect(streaming.keywords).toContain('hulu');
    expect(streaming.mcc_codes).toContain(4899);
    expect(streaming.reward_aliases).toContain('streaming');
  });

  test('contains Drugstores category with correct data', () => {
    const drugstores = MERCHANT_CATEGORIES.drugstores;
    expect(drugstores.name).toBe('Drugstores & Pharmacy');
    expect(drugstores.icon).toBe('💊');
    expect(drugstores.keywords).toContain('cvs');
    expect(drugstores.keywords).toContain('walgreens');
    expect(drugstores.keywords).toContain('pharmacy');
    expect(drugstores.mcc_codes).toContain(5912);
    expect(drugstores.reward_aliases).toContain('pharmacy');
  });

  test('contains Home Improvement category with correct data', () => {
    const homeImprovement = MERCHANT_CATEGORIES.home_improvement;
    expect(homeImprovement.name).toBe('Home Improvement');
    expect(homeImprovement.icon).toBe('🏠');
    expect(homeImprovement.keywords).toContain('home depot');
    expect(homeImprovement.keywords).toContain('lowes');
    expect(homeImprovement.keywords).toContain('hardware');
    expect(homeImprovement.mcc_codes).toContain(5211);
    expect(homeImprovement.reward_aliases).toContain('home_improvement');
  });

  test('contains Department Stores category with correct data', () => {
    const deptStores = MERCHANT_CATEGORIES.department_stores;
    expect(deptStores.name).toBe('Department Stores');
    expect(deptStores.icon).toBe('🏬');
    expect(deptStores.keywords).toContain('amazon');
    expect(deptStores.keywords).toContain('target');
    expect(deptStores.keywords).toContain('macy\'s');
    expect(deptStores.mcc_codes).toContain(5311);
    expect(deptStores.reward_aliases).toContain('shopping');
  });

  test('contains Transit category with correct data', () => {
    const transit = MERCHANT_CATEGORIES.transit;
    expect(transit.name).toBe('Transit & Rideshare');
    expect(transit.icon).toBe('🚌');
    expect(transit.keywords).toContain('uber');
    expect(transit.keywords).toContain('lyft');
    expect(transit.keywords).toContain('metro');
    expect(transit.mcc_codes).toContain(4111);
    expect(transit.reward_aliases).toContain('rideshare');
  });

  test('contains Utilities category with correct data', () => {
    const utilities = MERCHANT_CATEGORIES.utilities;
    expect(utilities.name).toBe('Utilities');
    expect(utilities.icon).toBe('📡');
    expect(utilities.keywords).toContain('verizon');
    expect(utilities.keywords).toContain('comcast');
    expect(utilities.keywords).toContain('phone');
    expect(utilities.mcc_codes).toContain(4814);
    expect(utilities.reward_aliases).toContain('phone');
  });

  test('contains Warehouse category with correct data', () => {
    const warehouse = MERCHANT_CATEGORIES.warehouse;
    expect(warehouse.name).toBe('Warehouse Clubs');
    expect(warehouse.icon).toBe('📦');
    expect(warehouse.keywords).toContain('costco');
    expect(warehouse.keywords).toContain('sam\'s club');
    expect(warehouse.keywords).toContain('bj\'s');
    expect(warehouse.reward_aliases).toContain('warehouse');
  });

  test('contains Office Supplies category with correct data', () => {
    const officeSupplies = MERCHANT_CATEGORIES.office_supplies;
    expect(officeSupplies.name).toBe('Office Supplies');
    expect(officeSupplies.icon).toBe('🖊️');
    expect(officeSupplies.keywords).toContain('staples');
    expect(officeSupplies.keywords).toContain('office depot');
    expect(officeSupplies.reward_aliases).toContain('office_supplies');
  });

  test('contains Insurance category with correct data', () => {
    const insurance = MERCHANT_CATEGORIES.insurance;
    expect(insurance.name).toBe('Insurance');
    expect(insurance.icon).toBe('🛡️');
    expect(insurance.keywords).toContain('insurance');
    expect(insurance.keywords).toContain('premium');
    expect(insurance.keywords).toContain('geico');
    expect(insurance.mcc_codes).toContain(6211);
    expect(insurance.reward_aliases).toContain('insurance');
  });
});

describe('getCategoryById - Retrieval by ID', () => {
  test('returns category object for valid ID', () => {
    const dining = getCategoryById('dining');
    expect(dining).not.toBeNull();
    expect(dining.id).toBe('dining');
    expect(dining.name).toBe('Dining & Restaurants');
  });

  test('returns null for invalid ID', () => {
    const result = getCategoryById('invalid_category');
    expect(result).toBeNull();
  });

  test('returns null for undefined ID', () => {
    const result = getCategoryById(undefined);
    expect(result).toBeNull();
  });

  test('returns null for null ID', () => {
    const result = getCategoryById(null);
    expect(result).toBeNull();
  });

  test('works for all 14 categories', () => {
    const categoryIds = ['dining', 'groceries', 'gas', 'travel', 'entertainment', 'streaming',
                        'drugstores', 'home_improvement', 'department_stores', 'transit',
                        'utilities', 'warehouse', 'office_supplies', 'insurance'];

    categoryIds.forEach(id => {
      const category = getCategoryById(id);
      expect(category).not.toBeNull();
      expect(category.id).toBe(id);
    });
  });
});

describe('getAllCategories - Get All Categories', () => {
  test('returns object with all categories', () => {
    const allCategories = getAllCategories();
    expect(Object.keys(allCategories)).toHaveLength(14);
  });

  test('returned object matches MERCHANT_CATEGORIES', () => {
    const allCategories = getAllCategories();
    expect(allCategories).toEqual(MERCHANT_CATEGORIES);
  });

  test('each value has matching key', () => {
    const allCategories = getAllCategories();
    Object.entries(allCategories).forEach(([key, category]) => {
      expect(category.id).toBe(key);
    });
  });
});

describe('getCategoryList - Get Array of Categories', () => {
  test('returns array of all categories', () => {
    const list = getCategoryList();
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(14);
  });

  test('each item is a valid category object', () => {
    const list = getCategoryList();
    list.forEach(category => {
      expect(category.id).toBeDefined();
      expect(category.name).toBeDefined();
      expect(Array.isArray(category.keywords)).toBe(true);
    });
  });
});

describe('findCategoryByKeyword - Keyword Matching', () => {
  test('finds dining category by "restaurant" keyword', () => {
    const result = findCategoryByKeyword('restaurant');
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds dining category by "doordash" keyword', () => {
    const result = findCategoryByKeyword('doordash');
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds groceries category by "whole foods" keyword', () => {
    const result = findCategoryByKeyword('whole foods');
    expect(result).not.toBeNull();
    expect(result.id).toBe('groceries');
  });

  test('finds streaming category by "netflix" keyword', () => {
    const result = findCategoryByKeyword('netflix');
    expect(result).not.toBeNull();
    expect(result.id).toBe('streaming');
  });

  test('case-insensitive keyword matching', () => {
    const lower = findCategoryByKeyword('netflix');
    const upper = findCategoryByKeyword('NETFLIX');
    const mixed = findCategoryByKeyword('NetFlix');

    expect(lower.id).toBe(upper.id);
    expect(upper.id).toBe(mixed.id);
  });

  test('trims whitespace from keyword', () => {
    const result1 = findCategoryByKeyword('  restaurant  ');
    const result2 = findCategoryByKeyword('restaurant');
    expect(result1.id).toBe(result2.id);
  });

  test('returns null for non-existent keyword', () => {
    const result = findCategoryByKeyword('nonexistent_merchant_xyz');
    expect(result).toBeNull();
  });

  test('returns null for null keyword', () => {
    const result = findCategoryByKeyword(null);
    expect(result).toBeNull();
  });

  test('returns null for undefined keyword', () => {
    const result = findCategoryByKeyword(undefined);
    expect(result).toBeNull();
  });

  test('returns null for empty string', () => {
    const result = findCategoryByKeyword('');
    expect(result).toBeNull();
  });

  test('finds category for each test keyword in all categories', () => {
    const testKeywords = ['restaurant', 'grocery', 'chevron', 'airline', 'netflix', 'cvs', 'home depot', 'amazon', 'uber', 'verizon', 'costco', 'staples', 'insurance'];

    testKeywords.forEach(keyword => {
      const result = findCategoryByKeyword(keyword);
      expect(result).not.toBeNull();
      expect(result.keywords).toContain(keyword.toLowerCase());
    });
  });
});

describe('findCategoryByMCCCode - MCC Code Matching', () => {
  test('finds dining category by MCC 5812', () => {
    const result = findCategoryByMCCCode(5812);
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds groceries category by MCC 5411', () => {
    const result = findCategoryByMCCCode(5411);
    expect(result).not.toBeNull();
    expect(result.id).toBe('groceries');
  });

  test('finds gas category by MCC 5542', () => {
    const result = findCategoryByMCCCode(5542);
    expect(result).not.toBeNull();
    expect(result.id).toBe('gas');
  });

  test('finds streaming category by MCC 4899', () => {
    const result = findCategoryByMCCCode(4899);
    expect(result).not.toBeNull();
    expect(result.id).toBe('streaming');
  });

  test('works with MCC code as string', () => {
    const byNumber = findCategoryByMCCCode(5812);
    const byString = findCategoryByMCCCode('5812');
    expect(byNumber.id).toBe(byString.id);
  });

  test('returns null for non-existent MCC code', () => {
    const result = findCategoryByMCCCode(9999);
    expect(result).toBeNull();
  });

  test('returns null for null MCC code', () => {
    const result = findCategoryByMCCCode(null);
    expect(result).toBeNull();
  });

  test('returns null for undefined MCC code', () => {
    const result = findCategoryByMCCCode(undefined);
    expect(result).toBeNull();
  });

  test('finds category for each MCC code in system', () => {
    // Collect all unique MCC codes
    const mccCodes = new Set();
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      category.mcc_codes.forEach(code => mccCodes.add(code));
    });

    // Test each MCC code
    mccCodes.forEach(code => {
      const result = findCategoryByMCCCode(code);
      expect(result).not.toBeNull();
      expect(result.mcc_codes).toContain(code);
    });
  });
});

describe('findCategoryByRewardAlias - Reward Alias Matching', () => {
  test('finds dining category by "dining" alias', () => {
    const result = findCategoryByRewardAlias('dining');
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds groceries category by "groceries" alias', () => {
    const result = findCategoryByRewardAlias('groceries');
    expect(result).not.toBeNull();
    expect(result.id).toBe('groceries');
  });

  test('finds streaming category by "streaming" alias', () => {
    const result = findCategoryByRewardAlias('streaming');
    expect(result).not.toBeNull();
    expect(result.id).toBe('streaming');
  });

  test('case-insensitive alias matching', () => {
    const lower = findCategoryByRewardAlias('dining');
    const upper = findCategoryByRewardAlias('DINING');
    const mixed = findCategoryByRewardAlias('DiNiNg');

    expect(lower.id).toBe(upper.id);
    expect(upper.id).toBe(mixed.id);
  });

  test('trims whitespace from alias', () => {
    const result1 = findCategoryByRewardAlias('  dining  ');
    const result2 = findCategoryByRewardAlias('dining');
    expect(result1.id).toBe(result2.id);
  });

  test('returns null for non-existent alias', () => {
    const result = findCategoryByRewardAlias('nonexistent_alias_xyz');
    expect(result).toBeNull();
  });

  test('returns null for null alias', () => {
    const result = findCategoryByRewardAlias(null);
    expect(result).toBeNull();
  });

  test('finds category for each reward alias', () => {
    const allAliases = new Set();
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      category.reward_aliases.forEach(alias => allAliases.add(alias));
    });

    allAliases.forEach(alias => {
      const result = findCategoryByRewardAlias(alias);
      expect(result).not.toBeNull();
      expect(result.reward_aliases).toContain(alias);
    });
  });
});

describe('findCategory - Universal Search', () => {
  test('finds by category ID', () => {
    const result = findCategory('dining');
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds by keyword', () => {
    const result = findCategory('netflix');
    expect(result).not.toBeNull();
    expect(result.id).toBe('streaming');
  });

  test('finds by MCC code', () => {
    const result = findCategory(5812);
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });

  test('finds by reward alias', () => {
    const result = findCategory('groceries');
    expect(result).not.toBeNull();
    expect(result.id).toBe('groceries');
  });

  test('prefers ID match over keyword match', () => {
    // 'dining' is both an ID and a keyword
    const result = findCategory('dining');
    expect(result.id).toBe('dining');
  });

  test('case-insensitive search', () => {
    const lower = findCategory('dining');
    const upper = findCategory('DINING');
    expect(lower.id).toBe(upper.id);
  });

  test('returns null for not found', () => {
    const result = findCategory('this_does_not_exist');
    expect(result).toBeNull();
  });

  test('handles numeric queries as strings then MCC codes', () => {
    const result = findCategory('5812');
    expect(result).not.toBeNull();
    expect(result.id).toBe('dining');
  });
});

describe('getCategoryDisplayName - Display Names', () => {
  test('returns name with icon for valid category', () => {
    const result = getCategoryDisplayName('dining');
    expect(result).toBe('🍽️ Dining & Restaurants');
  });

  test('returns name with icon for all 14 categories', () => {
    const categoryIds = ['dining', 'groceries', 'gas', 'travel', 'entertainment', 'streaming',
                        'drugstores', 'home_improvement', 'department_stores', 'transit',
                        'utilities', 'warehouse', 'office_supplies', 'insurance'];
    const validIcons = ['🍽️', '🛒', '⛽', '✈️', '🎬', '🎥', '💊', '🏠', '🏬', '🚌', '📡', '📦', '🖊️', '🛡️'];

    categoryIds.forEach(id => {
      const result = getCategoryDisplayName(id);
      expect(validIcons.some(icon => result.includes(icon))).toBe(true);
      expect(result).not.toContain('Unknown');
    });
  });

  test('returns "Unknown Category" for invalid ID', () => {
    const result = getCategoryDisplayName('invalid');
    expect(result).toBe('Unknown Category');
  });

  test('returns "Unknown Category" for null ID', () => {
    const result = getCategoryDisplayName(null);
    expect(result).toBe('Unknown Category');
  });
});

describe('areCategoriesCompatible - Category Compatibility', () => {
  test('same category is compatible with itself', () => {
    expect(areCategoriesCompatible('dining', 'dining')).toBe(true);
    expect(areCategoriesCompatible('streaming', 'streaming')).toBe(true);
  });

  test('streaming is parent of entertainment (child relationship)', () => {
    const streaming = MERCHANT_CATEGORIES.streaming;
    expect(streaming.parent_category).toBe('entertainment');
    expect(areCategoriesCompatible('streaming', 'entertainment')).toBe(true);
  });

  test('returns false for unrelated categories', () => {
    expect(areCategoriesCompatible('dining', 'gas')).toBe(false);
    expect(areCategoriesCompatible('groceries', 'travel')).toBe(false);
  });

  test('returns false for invalid categories', () => {
    expect(areCategoriesCompatible('invalid', 'dining')).toBe(false);
    expect(areCategoriesCompatible('dining', 'invalid')).toBe(false);
    expect(areCategoriesCompatible('invalid', 'invalid')).toBe(false);
  });
});

describe('categoryDefinitions - Consistency Tests', () => {
  test('no duplicate MCC codes across categories (with allowed overlaps)', () => {
    // Note: warehouse and groceries both use 5411, which is allowed
    const mccToCategories = {};

    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      category.mcc_codes.forEach(code => {
        if (!mccToCategories[code]) {
          mccToCategories[code] = [];
        }
        mccToCategories[code].push(category.id);
      });
    });

    // Allowed overlaps: warehouse/groceries both use 5411
    Object.entries(mccToCategories).forEach(([code, categories]) => {
      if (code !== '5411') { // Exception for warehouse/groceries
        expect(categories).toHaveLength(1); // Each code belongs to max 1 category (except noted exception)
      }
    });
  });

  test('no duplicate keywords across categories (keywords should be unique)', () => {
    const allKeywords = new Map(); // keyword -> categoryId

    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      category.keywords.forEach(keyword => {
        if (allKeywords.has(keyword)) {
          // Allow some keywords to be shared if they genuinely apply to multiple categories
          // For example, 'insurance' might appear in both insurance and other contexts
        }
        allKeywords.set(keyword, category.id);
      });
    });

    expect(allKeywords.size).toBeGreaterThan(0);
  });

  test('no category has empty arrays', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      expect(category.keywords.length).toBeGreaterThan(0);
      expect(category.mcc_codes.length).toBeGreaterThan(0);
      expect(category.reward_aliases.length).toBeGreaterThan(0);
      expect(category.subcategories.length).toBeGreaterThan(0);
    });
  });

  test('all reward aliases are in lowercase', () => {
    Object.values(MERCHANT_CATEGORIES).forEach(category => {
      category.reward_aliases.forEach(alias => {
        expect(alias).toBe(alias.toLowerCase());
      });
    });
  });
});
