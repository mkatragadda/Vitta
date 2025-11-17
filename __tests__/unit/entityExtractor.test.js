/**
 * Unit Tests for Entity Extractor
 * Tests category extraction, merchant extraction, and entity precedence
 */

import { extractEntities } from '../../services/chat/entityExtractor';

describe('Entity Extractor - Category Extraction', () => {
  test('extracts "travel" category from "best card for travel"', () => {
    const entities = extractEntities('best card for travel');
    
    expect(entities.category).toBe('travel');
    expect(entities.merchant).toBeNull(); // Should not be extracted as merchant
  });

  test('extracts "travel" category from "suggest best card for travel"', () => {
    const entities = extractEntities('suggest best card for travel');
    
    expect(entities.category).toBe('travel');
  });

  test('extracts "travel" category from "which card for travel"', () => {
    const entities = extractEntities('which card for travel');
    
    expect(entities.category).toBe('travel');
  });

  test('extracts "dining" category from "best card for dining"', () => {
    const entities = extractEntities('best card for dining');
    
    expect(entities.category).toBe('dining');
  });

  test('extracts "groceries" category from "which card for groceries"', () => {
    const entities = extractEntities('which card for groceries');
    
    expect(entities.category).toBe('groceries');
  });

  test('extracts "gas" category from "best card for gas"', () => {
    const entities = extractEntities('best card for gas');
    
    expect(entities.category).toBe('gas');
  });

  test('extracts "travel" from "flight" keyword', () => {
    const entities = extractEntities('which card for flight booking');
    
    expect(entities.category).toBe('travel');
  });

  test('extracts "travel" from "hotel" keyword', () => {
    const entities = extractEntities('best card for hotel');
    
    expect(entities.category).toBe('travel');
  });

  test('extracts "entertainment" category', () => {
    const entities = extractEntities('which card for entertainment');
    
    expect(entities.category).toBe('entertainment');
  });

  test('extracts "streaming" category', () => {
    const entities = extractEntities('best card for streaming services');
    
    expect(entities.category).toBe('streaming');
  });
});

describe('Entity Extractor - Category vs Merchant Precedence', () => {
  test('category takes precedence over merchant when both match', () => {
    const entities = extractEntities('best card for travel');
    
    expect(entities.category).toBe('travel');
    expect(entities.merchant).toBeNull(); // "travel" should not be merchant
  });

  test('merchant extraction works when no category matches', () => {
    // Test with a merchant that doesn't map to a category
    const entities = extractEntities('best card for walmart');
    
    expect(entities.merchant).toBe('walmart');
    expect(entities.category).toBeNull(); // Walmart doesn't map to a category
  });

  test('costco extracts as warehouse category (not merchant)', () => {
    // "best card for costco" should extract warehouse category
    // because Costco purchases fall under warehouse category
    const entities = extractEntities('best card for costco');
    
    expect(entities.category).toBe('warehouse');
    // Merchant might also be extracted, but category takes precedence
  });

  test('both category and merchant can be extracted for specific queries', () => {
    const entities = extractEntities('best card for travel at costco');
    
    expect(entities.category).toBe('travel');
    expect(entities.merchant).toBe('costco'); // Costco should still be extracted as merchant
  });
});

describe('Entity Extractor - Reward Structure Matching', () => {
  test('extracts category for reward optimization queries', () => {
    const entities = extractEntities('which card maximizes rewards for travel');
    
    expect(entities.category).toBe('travel');
  });

  test('extracts category with amount specified', () => {
    const entities = extractEntities('best card for $1000 travel purchase');
    
    expect(entities.category).toBe('travel');
    expect(entities.amount).toBe(1000);
  });
});

