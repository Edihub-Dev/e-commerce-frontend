import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { useSearch } from "../contexts/SearchContext";

const SearchResults = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    searchResults,
    isSearching,
    searchProducts,
    setSearchQuery,
    clearSearch,
  } = useSearch();
  const [mobileQuery, setMobileQuery] = useState("");
  const [isMobileFocused, setIsMobileFocused] = useState(false);
  const searchProductsRef = useRef(searchProducts);

  useEffect(() => {
    searchProductsRef.current = searchProducts;
  }, [searchProducts]);

  // Memoize the query to prevent unnecessary re-renders
  const query = useMemo(() => {
    return new URLSearchParams(location.search).get("q") || "";
  }, [location.search]);

  useEffect(() => {
    setMobileQuery(query);
  }, [query]);

  const handleMobileSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const trimmed = mobileQuery.trim();

      if (!trimmed) {
        setMobileQuery("");
        clearSearch();
        navigate("/");
        return;
      }

      setSearchQuery(trimmed);
      await searchProductsRef.current(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [mobileQuery, navigate, setSearchQuery, clearSearch]
  );

  const handleMobileClear = useCallback(() => {
    setMobileQuery("");
    clearSearch();
    navigate("/");
  }, [clearSearch, navigate]);

  // Only trigger search when query changes
  useEffect(() => {
    if (!query) {
      return;
    }

    searchProductsRef.current(query);
  }, [query]);

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
      <div className="md:hidden mb-6">
        <form
          onSubmit={handleMobileSubmit}
          className={`flex items-center rounded-full border bg-white px-4 py-2 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-100 ${
            isMobileFocused ? "border-blue-400" : "border-slate-200"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18a7.5 7.5 0 006.15-3.35z"
            />
          </svg>
          <input
            type="text"
            value={mobileQuery}
            onChange={(event) => setMobileQuery(event.target.value)}
            onFocus={() => setIsMobileFocused(true)}
            onBlur={() => setIsMobileFocused(false)}
            placeholder="Search products, categories…"
            className="ml-3 flex-1 border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search products"
          />
          {mobileQuery ? (
            <button
              type="button"
              onClick={handleMobileClear}
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear search"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          ) : null}
        </form>
      </div>
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
