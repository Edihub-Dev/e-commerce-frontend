import React, { createContext, useContext, useState, useCallback } from 'react';

const SearchContext = createContext();

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');

  // Helper function to normalize search terms by removing special characters and spaces
  const normalizeSearchTerm = (term) => {
    return term
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
  };

  // Memoize the search function to prevent unnecessary re-renders
  const searchProducts = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    
    // If the query is empty, clear results
    if (!trimmedQuery) {
      setSearchResults([]);
      setLastSearchQuery('');
      return [];
    }

    // Normalize the search query for comparison
    const normalizedQuery = normalizeSearchTerm(trimmedQuery);

    // If this is the same as the last search, return cached results
    if (normalizedQuery === lastSearchQuery && searchResults.length > 0) {
      return searchResults;
    }

    setIsSearching(true);
    
    try {
      // Use dynamic import to load mock data
      const response = await import("../data/mock");
      const allProducts = [
        ...response.merchDeals,
        // Add other product arrays here as needed
      ];

      // Add a small delay to show loading state (optional)
      await new Promise(resolve => setTimeout(resolve, 100));

      const filtered = allProducts.filter(product => {
        // Normalize product name and description for comparison
        const normalizedName = normalizeSearchTerm(product.name);
        const normalizedDesc = product.description ? normalizeSearchTerm(product.description) : '';
        
        // Check if the normalized query exists in either name or description
        return (
          normalizedName.includes(normalizedQuery) ||
          normalizedDesc.includes(normalizedQuery)
        );
      });

      setSearchResults(filtered);
      setLastSearchQuery(normalizedQuery);
      return filtered;
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [lastSearchQuery, searchResults.length]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setLastSearchQuery('');
  }, []);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        searchResults,
        isSearching,
        searchProducts,
        clearSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
