import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { fetchProducts } from "../utils/api";

const SearchContext = createContext();

const normalizeSearchTerm = (term = "") =>
  term
    .toLowerCase()
    .replace(/[^a-z0-9\-_\/.@#&+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const CATEGORY_KEYWORDS = Object.freeze({
  "Office Essentials": [
    "office essentials",
    "office supplies",
    "workstation accessories",
    "corporate gifts",
    "office stationery",
    "professional office items",
    "productivity tools",
    "business essentials",
    "corporate office products",
    "desk accessories",
    "office organization",
    "office gifting",
    "employee welcome kit",
    "office branding products",
    "custom office merchandise",
    "branded office supplies",
    "premium office stationery",
    "executive office kit",
    "corporate swag",
    "employee onboarding kit",
  ],
  Apparel: [
    "apparel",
    "clothing",
    "branded apparel",
    "corporate apparel",
    "fashion wear",
    "casual wear",
    "unisex apparel",
    "customized fashion",
    "promotional apparel",
    "clothing merchandise",
  ],
  Accessories: [
    "accessories",
    "fashion accessories",
    "corporate accessories",
    "utility accessories",
    "branded accessories",
    "daily-use accessories",
    "gift accessories",
    "promotional accessories",
    "merchandise accessories",
  ],
  "T-Shirts": [
    "t-shirts",
    "tshirts",
    "unisex tshirt",
    "cotton tshirt",
    "customized t-shirt",
    "printed t-shirt",
    "graphic tee",
    "branded tshirt",
    "corporate tshirt",
    "casual t-shirt",
    "round neck tshirt",
    "crew neck tshirt",
    "half-sleeve tshirt",
    "soft cotton tee",
    "daily wear tshirt",
    "premium fabric tshirt",
    "logo printed t-shirt",
    "promotional t-shirt",
  ],
});

const PRODUCT_KEYWORDS = Object.freeze({
  Keychain: [
    "keychain",
    "keychains",
    "metal keychain",
    "rubber keychain",
    "custom keychain",
    "branded keychain",
    "promotional keychain",
    "key ring",
    "key-holder accessory",
    "souvenir keychain",
    "corporate keychain",
    "personalized keychain",
  ],
  "Ceramic Coffee Mug": [
    "ceramic coffee mug",
    "coffee mug",
    "printed mug",
    "branded mug",
    "customized mug",
    "office mug",
    "premium ceramic mug",
    "tea cup mug",
    "corporate mug",
    "logo printed mug",
  ],
  "Executive Diary": [
    "executive diary",
    "diary + pen set",
    "premium diary set",
    "corporate gift set",
    "office stationery set",
    "branded diary",
    "luxury pen and diary",
    "notebook and pen combo",
    "gifting diary set",
    "custom diary pen set",
    "leather diary set",
  ],
  Diary: [
    "diary",
    "notebook",
    "office diary",
    "planner diary",
    "corporate diary",
    "daily journal",
    "leather diary",
    "spiral diary",
    "premium notebook",
    "branded notebook",
  ],
  Pen: [
    "pen",
    "corporate pen",
    "metal pen",
    "ball pen",
    "premium writing pen",
    "office pen",
    "branded pen",
    "signature pen",
    "promotional pen",
    "gift pen",
  ],
  "White Cap": [
    "white cap",
    "logo cap",
    "baseball cap",
    "branded cap",
    "textile headgear",
    "cotton cap",
    "embroidered cap",
    "adjustable cap",
    "promotional cap",
    "customized cap",
    "corporate cap",
    "printed cap",
  ],
});

const KEYWORD_PRIORITY = Object.freeze({
  product: 3,
  category: 2,
});

const KEYWORD_MATCH_THRESHOLD = 0.65;
const CATEGORY_FILTER_THRESHOLD = 0.55;
const MAX_CATEGORY_FILTERS = 2;
const SEARCH_REQUEST_TIMEOUT_MS = 12000;

const escapeRegExp = (value = "") =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const tokenizeValue = (value = "") =>
  normalizeSearchTerm(value)
    .split(/[-_\s]+/)
    .filter(Boolean);

const levenshteinDistance = (a = "", b = "") => {
  if (a === b) return 0;
  const aLength = a.length;
  const bLength = b.length;
  if (aLength === 0) return bLength;
  if (bLength === 0) return aLength;

  const matrix = Array.from({ length: aLength + 1 }, (_, i) => [i]);

  for (let j = 1; j <= bLength; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= aLength; i += 1) {
    for (let j = 1; j <= bLength; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[aLength][bLength];
};

const computeMatchScore = (queryValue = "", candidateValue = "") => {
  const normalizedQuery = normalizeSearchTerm(queryValue);
  const normalizedCandidate = normalizeSearchTerm(candidateValue);

  if (!normalizedQuery || !normalizedCandidate) {
    return 0;
  }

  if (normalizedQuery === normalizedCandidate) {
    return 1;
  }

  const queryLength = normalizedQuery.length;
  const candidateLength = normalizedCandidate.length;
  const normalizedQueryCompact = normalizedQuery.replace(/[-_\s]+/g, "");
  const normalizedCandidateCompact = normalizedCandidate.replace(
    /[-_\s]+/g,
    ""
  );

  const candidateIncludes = normalizedCandidateCompact.includes(
    normalizedQueryCompact
  )
    ? Math.min(0.95, queryLength / candidateLength)
    : 0;

  const queryIncludes = normalizedQueryCompact.includes(
    normalizedCandidateCompact
  )
    ? Math.min(0.9, candidateLength / queryLength)
    : 0;

  const prefixScore = normalizedCandidateCompact.startsWith(
    normalizedQueryCompact
  )
    ? Math.min(0.9, queryLength / candidateLength + 0.1)
    : 0;

  const queryTokens = Array.from(new Set(tokenizeValue(normalizedQuery)));
  const candidateTokens = Array.from(
    new Set(tokenizeValue(normalizedCandidate))
  );

  const tokenIntersection = queryTokens.filter((token) =>
    candidateTokens.includes(token)
  ).length;
  const tokenUnion = new Set([...queryTokens, ...candidateTokens]).size || 1;
  const tokenScore = tokenIntersection / tokenUnion;

  const tokenContainment = queryTokens.some((token) =>
    candidateTokens.some(
      (candidateToken) =>
        candidateToken.startsWith(token) || token.startsWith(candidateToken)
    )
  )
    ? 0.6
    : 0;

  const distance = levenshteinDistance(normalizedQuery, normalizedCandidate);
  const maxLength = Math.max(queryLength, candidateLength) || 1;
  const levenshteinScore = Math.max(0, 1 - distance / maxLength);

  const blendedScore = Math.max(
    candidateIncludes,
    queryIncludes,
    prefixScore,
    tokenScore,
    tokenContainment,
    (tokenScore + levenshteinScore) / 2
  );

  return Math.max(candidateIncludes, queryIncludes, prefixScore, blendedScore);
};

const buildSearchIndex = () => {
  const entries = [];

  Object.entries(CATEGORY_KEYWORDS).forEach(([canonical, keywords]) => {
    const synonyms = [canonical, ...(keywords || [])];
    entries.push({
      type: "category",
      canonical,
      canonicalNormalized: normalizeSearchTerm(canonical),
      synonyms,
    });
  });

  Object.entries(PRODUCT_KEYWORDS).forEach(([canonical, keywords]) => {
    const synonyms = [canonical, ...(keywords || [])];
    entries.push({
      type: "product",
      canonical,
      canonicalNormalized: normalizeSearchTerm(canonical),
      synonyms,
    });
  });

  return entries;
};

const KEYWORD_ENTRIES = buildSearchIndex();

const removeMatchedSegments = (normalizedValue = "", keywords = []) => {
  if (!normalizedValue) {
    return "";
  }

  let working = ` ${normalizedValue} `;

  keywords.forEach((keyword) => {
    if (!keyword) return;
    const pattern = new RegExp(`\\s${escapeRegExp(keyword)}(?=\\s)`, "g");
    working = working.replace(pattern, " ");
  });

  return working.replace(/\s+/g, " ").trim();
};

const findKeywordMatches = (rawQuery = "") => {
  const normalizedQuery = normalizeSearchTerm(rawQuery);

  if (!normalizedQuery) {
    return {
      matches: [],
      matchedCategories: [],
      matchedProducts: [],
      matchedKeywords: [],
    };
  }

  const matches = [];
  const matchedKeywords = new Set();

  KEYWORD_ENTRIES.forEach((entry) => {
    let bestScore = 0;
    let bestSynonym = "";

    entry.synonyms.forEach((synonym) => {
      const score = computeMatchScore(normalizedQuery, synonym);
      if (score > bestScore) {
        bestScore = score;
        bestSynonym = synonym;
      }
    });

    if (bestScore >= KEYWORD_MATCH_THRESHOLD) {
      const normalizedBestSynonym = normalizeSearchTerm(bestSynonym);
      matchedKeywords.add(normalizedBestSynonym);
      matches.push({
        type: entry.type,
        matchedItem: entry.canonical,
        matchedKeyword: bestSynonym,
        score: Number(bestScore.toFixed(4)),
        priority: KEYWORD_PRIORITY[entry.type] || 0,
      });
    }
  });

  matches.sort((a, b) => {
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.matchedItem.localeCompare(b.matchedItem);
  });

  return {
    matches,
    matchedCategories: matches.filter((match) => match.type === "category"),
    matchedProducts: matches.filter((match) => match.type === "product"),
    matchedKeywords: Array.from(matchedKeywords),
  };
};

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

const buildSearchCacheKey = (term, minPrice, maxPrice, categories = []) => {
  const normalizedTerm = normalizeSearchTerm(term).replace(/\s+/g, "");
  const normalizedCategories = Array.isArray(categories)
    ? categories.map((category) => normalizeSearchTerm(category)).sort()
    : [normalizeSearchTerm(categories)];

  return `${normalizedTerm}|min:${minPrice ?? ""}|max:${
    maxPrice ?? ""
  }|cat:${normalizedCategories.filter(Boolean).join("|")}`;
};

export const SearchProvider = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState("");
  const [keywordMatches, setKeywordMatches] = useState([]);
  const activeRequestRef = useRef(null);
  const searchResultsRef = useRef([]);
  const keywordMatchesRef = useRef([]);

  // Memoize the search function to prevent unnecessary re-renders
  const searchProducts = useCallback(
    async (query) => {
      const trimmedQuery = query.trim();

      // If the query is empty, clear results
      if (!trimmedQuery) {
        if (activeRequestRef.current) {
          activeRequestRef.current.abort();
          activeRequestRef.current = null;
        }
        setSearchResults([]);
        searchResultsRef.current = [];
        setLastSearchQuery("");
        setIsSearching(false);
        setKeywordMatches([]);
        keywordMatchesRef.current = [];
        return [];
      }

      const { searchTerm, minPrice, maxPrice } =
        parsePriceFilters(trimmedQuery);
      const { matches, matchedCategories, matchedProducts, matchedKeywords } =
        findKeywordMatches(trimmedQuery);

      const selectedCategoryMatches = matchedCategories
        .filter(({ score }) => score >= CATEGORY_FILTER_THRESHOLD)
        .slice(0, MAX_CATEGORY_FILTERS);

      const categoryFilters = selectedCategoryMatches.map(
        ({ matchedItem }) => matchedItem
      );

      const normalizedBaseTerm = normalizeSearchTerm(searchTerm);
      const baseWithoutKeywords = removeMatchedSegments(
        normalizedBaseTerm,
        matchedKeywords
      );

      const searchPhrases = new Set();

      if (baseWithoutKeywords) {
        searchPhrases.add(baseWithoutKeywords);
      }

      matchedProducts.slice(0, 3).forEach(({ matchedItem, score }) => {
        if (score >= KEYWORD_MATCH_THRESHOLD) {
          searchPhrases.add(matchedItem);
        }
      });

      const expandedSearchTerm = Array.from(searchPhrases)
        .filter(Boolean)
        .join(" ")
        .trim();

      const finalSearchTerm =
        expandedSearchTerm || normalizedBaseTerm || trimmedQuery;

      const searchKey = buildSearchCacheKey(
        finalSearchTerm,
        minPrice,
        maxPrice,
        categoryFilters
      );

      // If this is the same as the last search, return cached results
      if (searchKey === lastSearchQuery && searchResults.length > 0) {
        if (activeRequestRef.current) {
          activeRequestRef.current.abort();
          activeRequestRef.current = null;
        }
        setIsSearching(false);
        return {
          products: searchResultsRef.current,
          keywordMatches: keywordMatchesRef.current,
        };
      }

      if (activeRequestRef.current) {
        activeRequestRef.current.abort();
      }

      const abortController = new AbortController();
      activeRequestRef.current = abortController;
      setIsSearching(true);

      try {
        const params = { limit: 50 };
        if (finalSearchTerm) {
          params.search = finalSearchTerm;
        }
        if (typeof minPrice === "number") {
          params.minPrice = minPrice;
        }
        if (typeof maxPrice === "number") {
          params.maxPrice = maxPrice;
        }
        if (categoryFilters.length > 0) {
          params.category = categoryFilters.join(",");
        }

        const { data } = await fetchProducts(params, {
          signal: abortController.signal,
          timeout: SEARCH_REQUEST_TIMEOUT_MS,
        });

        setSearchQuery(trimmedQuery);
        setSearchResults(data || []);
        searchResultsRef.current = data || [];
        setKeywordMatches(matches);
        keywordMatchesRef.current = matches;
        setLastSearchQuery(searchKey);
        return {
          products: data || [],
          keywordMatches: matches,
        };
      } catch (error) {
        const isCanceled =
          error?.name === "CanceledError" ||
          error?.code === "ERR_CANCELED" ||
          abortController.signal.aborted;

        if (!isCanceled) {
          console.error("Search error:", error);
          setSearchResults([]);
          searchResultsRef.current = [];
          setKeywordMatches([]);
          keywordMatchesRef.current = [];
        }

        return [];
      } finally {
        if (activeRequestRef.current === abortController) {
          activeRequestRef.current = null;
          setIsSearching(false);
        }
      }
    },
    [lastSearchQuery]
  );

  const clearSearch = useCallback(() => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
      activeRequestRef.current = null;
    }
    setSearchQuery("");
    setSearchResults([]);
    searchResultsRef.current = [];
    setLastSearchQuery("");
    setKeywordMatches([]);
    keywordMatchesRef.current = [];
    setIsSearching(false);
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
        keywordMatches,
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
