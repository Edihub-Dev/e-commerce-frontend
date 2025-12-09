import React, { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { useSearch } from "../contexts/SearchContext";

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { searchResults, isSearching, searchProducts } = useSearch();

  // Memoize the query to prevent unnecessary re-renders
  const query = useMemo(() => {
    return new URLSearchParams(location.search).get("q") || "";
  }, [location.search]);

  // Only trigger search when query changes
  useEffect(() => {
    let isMounted = true;

    const performSearch = async () => {
      if (query) {
        await searchProducts(query);
      }
    };

    if (isMounted) {
      performSearch();
    }

    return () => {
      isMounted = false;
    };
  }, [query, searchProducts]);

  // Memoize the loading state to prevent unnecessary re-renders
  const loadingContent = useMemo(
    () => (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#008ECC] mx-auto mb-4"></div>
          <p className="text-gray-600">Searching for "{query}"...</p>
        </div>
      </div>
    ),
    [query]
  );

  // Memoize the results content
  const resultsContent = useMemo(() => {
    if (searchResults.length > 0) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {searchResults.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      );
    }

    if (query && !isSearching) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">
            We couldn't find any products matching "{query}"
          </p>
          <button
            onClick={() => navigate("/")}
            className="bg-[#008ECC] text-white px-6 py-2 rounded-md hover:bg-[#0078b5] transition-colors"
          >
            Continue Shopping
          </button>
        </div>
      );
    }

    return null;
  }, [searchResults, query, isSearching, navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {isSearching ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {loadingContent}
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {query && (
              <h1 className="text-2xl font-bold mb-6">
                {searchResults.length > 0
                  ? `Search Results for "${query}"`
                  : `No results found for "${query}"`}
              </h1>
            )}
            {resultsContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchResults;
