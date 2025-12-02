import React, { createContext, useContext, useState, useCallback } from "react";
import { fetchProducts } from "../utils/api";

const SearchContext = createContext();

const normalizeSearchTerm = (term = "") =>
  term
    .toLowerCase()
    .replace(/[^a-z0-9\-_\/.@#&+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizePriceValue = (value) => {
  if (!value) return undefined;
  const trimmed = value.toString().trim().toLowerCase();
  if (!trimmed) return undefined;

  const multiplier = trimmed.endsWith("k")
    ? 1000
    : trimmed.endsWith("m")
    ? 1000000
    : 1;

  const numericPart = multiplier === 1 ? trimmed : trimmed.slice(0, -1);
  const parsed = Number.parseFloat(numericPart.replace(/[,₹]/g, ""));
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return Math.max(parsed * multiplier, 0);
};

const priceKeywordPattern =
  /(?:under|below|less than|up to|upto|within|maximum|max|<=)\s*₹?\s*(\d+[\dkm\.]*)|(?:above|over|greater than|more than|minimum|min|>=)\s*₹?\s*(\d+[\dkm\.]*)/gi;
const betweenPattern =
  /between\s+₹?\s*(\d+[\dkm\.]*)\s+(?:and|to)\s+₹?\s*(\d+[\dkm\.]*)/i;
const hyphenRangePattern = /(\d+[\dkm\.]*)\s*[-–—]\s*(\d+[\dkm\.]*)/;
const currencyLabelPattern = /(?:rs\.?|inr|rupees?)/gi;

const parsePriceFilters = (rawQuery = "") => {
  let workingQuery = String(rawQuery);
  let minPrice;
  let maxPrice;

  const betweenMatch = workingQuery.match(betweenPattern);
  if (betweenMatch) {
    const [, lowerRaw, upperRaw] = betweenMatch;
    const lower = normalizePriceValue(lowerRaw);
    const upper = normalizePriceValue(upperRaw);
    if (typeof lower === "number" && typeof upper === "number") {
      minPrice = Math.min(lower, upper);
      maxPrice = Math.max(lower, upper);
    }
    workingQuery = workingQuery.replace(betweenMatch[0], " ");
  }

  if (typeof minPrice !== "number" || typeof maxPrice !== "number") {
    const hyphenMatch = workingQuery.match(hyphenRangePattern);
    if (hyphenMatch) {
      const [, lowerRaw, upperRaw] = hyphenMatch;
      const lower = normalizePriceValue(lowerRaw);
      const upper = normalizePriceValue(upperRaw);
      if (typeof lower === "number" && typeof upper === "number") {
        minPrice =
          typeof minPrice === "number" ? minPrice : Math.min(lower, upper);
        maxPrice =
          typeof maxPrice === "number" ? maxPrice : Math.max(lower, upper);
      }
      workingQuery = workingQuery.replace(hyphenMatch[0], " ");
    }
  }

  workingQuery = workingQuery.replace(
    priceKeywordPattern,
    (match, maxVal, minVal) => {
      if (maxVal && typeof maxPrice !== "number") {
        const normalizedMax = normalizePriceValue(maxVal);
        if (typeof normalizedMax === "number") {
          maxPrice = normalizedMax;
        }
      }
      if (minVal && typeof minPrice !== "number") {
        const normalizedMin = normalizePriceValue(minVal);
        if (typeof normalizedMin === "number") {
          minPrice = normalizedMin;
        }
      }
      return " ";
    }
  );

  const sanitizedQuery = workingQuery
    .replace(currencyLabelPattern, " ")
    .replace(/₹/g, " ")
    .replace(/[^a-z0-9\s\-_/\.@#&+]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  const finalSearchTerm = sanitizedQuery || workingQuery.trim();

  if (typeof maxPrice === "number" && typeof minPrice !== "number") {
    minPrice = 0;
  }

  return {
    searchTerm: finalSearchTerm,
    minPrice,
    maxPrice,
  };
};

const buildSearchCacheKey = (term, minPrice, maxPrice) =>
  `${normalizeSearchTerm(term).replace(/\s+/g, "")}|min:${minPrice ?? ""}|max:${
    maxPrice ?? ""
  }`;

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");

  // Memoize the search function to prevent unnecessary re-renders
  const searchProducts = useCallback(
    async (query) => {
      const trimmedQuery = query.trim();

      // If the query is empty, clear results
      if (!trimmedQuery) {
        setSearchResults([]);
        setLastSearchQuery("");
        return [];
      }

      const { searchTerm, minPrice, maxPrice } =
        parsePriceFilters(trimmedQuery);
      const searchKey = buildSearchCacheKey(searchTerm, minPrice, maxPrice);

      // If this is the same as the last search, return cached results
      if (searchKey === lastSearchQuery && searchResults.length > 0) {
        return searchResults;
      }

      setIsSearching(true);

      try {
        const params = { limit: 50 };
        if (searchTerm) {
          params.search = searchTerm;
        }
        if (typeof minPrice === "number") {
          params.minPrice = minPrice;
        }
        if (typeof maxPrice === "number") {
          params.maxPrice = maxPrice;
        }

        const { data } = await fetchProducts(params);

        setSearchQuery(trimmedQuery);
        setSearchResults(data || []);
        setLastSearchQuery(searchKey);
        return data || [];
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults([]);
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [lastSearchQuery, searchResults.length]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults([]);
    setLastSearchQuery("");
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
    throw new Error("useSearch must be used within a SearchProvider");
  }
  return context;
};
