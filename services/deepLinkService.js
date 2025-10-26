/**
 * Deep Link Service
 * Manages screen navigation deep links and search functionality
 * Uses local JSON file instead of API calls
 */

import deeplinksData from '../data/deeplinks.json';

/**
 * Get all active screen deep links from local JSON
 */
export const getAllDeepLinks = () => {
  console.log('[DeepLink] Loading deep links from local JSON');
  return deeplinksData;
};

/**
 * Get deep link by screen key
 */
export const getDeepLinkByKey = (screenKey) => {
  return deeplinksData.find(link => link.screen_key === screenKey);
};

/**
 * Search for deep links by query
 * Matches against screen_name, description, and keywords
 */
export const searchDeepLinks = (query) => {
  const lowerQuery = query.toLowerCase();

  return deeplinksData.filter(link => {
    const nameMatch = link.screen_name.toLowerCase().includes(lowerQuery);
    const descMatch = link.description.toLowerCase().includes(lowerQuery);
    const keywordMatch = link.keywords.some(keyword =>
      keyword.toLowerCase().includes(lowerQuery) || lowerQuery.includes(keyword.toLowerCase())
    );
    return nameMatch || descMatch || keywordMatch;
  });
};

/**
 * Find the best matching deep link for a user query
 * Returns the most relevant screen based on query intent
 */
export const findBestMatchingScreen = (query) => {
  const results = searchDeepLinks(query);

  if (results.length === 0) {
    return null;
  }

  // Score each result based on relevance
  const scoredResults = results.map(link => {
    let score = 0;
    const lowerQuery = query.toLowerCase();

    // Exact match in screen name (highest priority)
    if (link.screen_name.toLowerCase() === lowerQuery) {
      score += 100;
    } else if (link.screen_name.toLowerCase().includes(lowerQuery)) {
      score += 50;
    }

    // Keyword exact matches
    link.keywords.forEach(keyword => {
      if (keyword.toLowerCase() === lowerQuery) {
        score += 80;
      } else if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 40;
      } else if (keyword.toLowerCase().includes(lowerQuery)) {
        score += 20;
      }
    });

    // Description matches
    if (link.description.toLowerCase().includes(lowerQuery)) {
      score += 10;
    }

    return { ...link, score };
  });

  // Sort by score and return the best match
  scoredResults.sort((a, b) => b.score - a.score);
  return scoredResults[0];
};

/**
 * Generate a clickable deep link URL for chat responses
 */
export const generateDeepLinkMarkdown = (screenPath, displayText) => {
  return `[${displayText}](vitta://navigate/${screenPath})`;
};

/**
 * Create a formatted navigation suggestion for chat
 */
export const createNavigationSuggestion = (query) => {
  const bestMatch = findBestMatchingScreen(query);

  if (!bestMatch) {
    return null;
  }

  return {
    screen: bestMatch,
    markdown: generateDeepLinkMarkdown(bestMatch.screen_path, bestMatch.screen_name),
    message: `You can access this in ${generateDeepLinkMarkdown(bestMatch.screen_path, bestMatch.screen_name)}.`
  };
};
