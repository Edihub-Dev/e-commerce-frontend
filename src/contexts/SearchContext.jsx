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
    "yellow polo t-shirt",
    "mst blockchain official polo t-shirt yellow edition",
    "mens yellow polo",
    "men's yellow polo",
    "bright yellow polo shirt",
    "solid yellow collar t-shirt",
    "logo printed polo",
    "blockchain merchandise",
    "crypto merch india",
    "mst branded t-shirt",
    "cotton polo t-shirt for men",
    "casual polo for men",
    "half sleeve polo shirt",
    "regular fit polo",
    "soft cotton polo",
    "breathable fabric polo",
    "lightweight yellow polo",
    "white polo t-shirt",
    "blue polo t-shirt",
    "mst blockchain official polo t-shirt white edition",
    "mst blockchain official polo t-shirt blue edition",
    "mens white polo",
    "men's white polo",
    "mens blue polo",
    "men's blue polo",
    "solid white collar t-shirt",
    "solid blue collar t-shirt",
    "classic white polo shirt",
    "classic blue polo shirt",
    "stylish men's polo t-shirt",
    "office wear polo",
    "college wear t-shirt",
    "daily wear polo tee",
    "summer polo shirt men",
    "trendy polo t-shirt",
    "premium cotton polo",
    "comfortable polo for summer",
    "men's collar neck t-shirt",
    "high-quality polo shirt india",
    "affordable polo t-shirt under 600",
    "men's polo with printed logo",
    "sports polo shirt",
    "gym polo t-shirt",
    "tech community apparel",
    "blockchain branded clothing",
    "crypto t-shirt men",
    "yellow edition polo",
    "minimal design polo t-shirt",
    "corporate polo shirt",
    "weekend outfit polo",
    "men's casual wear t-shirt",
    "cotton",
    "graphic",
    "round",
    "yellow",
    "white",
    "blue",
    "polo",
    "collar",
    "breathable",
    "lightweight",
    "summer",
    "casual",
    "premium",
    "comfort",
    "stylish",
    "logo",
    "blockchain",
    "crypto",
    "merch",
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
    "mst blockchain premium metal keychain",
    "blockchain keychain",
    "crypto merch keychain",
    "mst logo keychain",
    "metal keyring",
    "premium round keychain",
    "stylish metal keychain",
    "durable steel keychain",
    "lightweight keychain",
    "crypto accessory",
    "blockchain merchandise india",
    "mst branded accessories",
    "office keychain",
    "car keychain metal",
    "bike keychain metal",
    "mens metal keychain",
    "men's metal keychain",
    "womens metal keychain",
    "women's metal keychain",
    "designer keychain for keys",
    "premium keychain under 100",
    "affordable metal keychain",
    "modern logo keychain",
    "tech community merch",
    "blockchain gift item",
    "round metal keychain with logo",
    "everyday carry keychain",
    "strong metal ring keychain",
    "trendy keychain for men",
    "keyring for home keys",
    "keychain for bags",
    "fashion keychain",
    "premium gifting keychain",
    "minimal design keychain",
    "stylish circular keyring",
    "branded metal keychain",
    "spartan keychain",
    "crypto keyring",
    "logo keychain",
    "metal ring keychain",
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
    "mst blockchain ceramic coffee mug",
    "blockchain coffee mug",
    "mst logo mug",
    "ceramic tea mug",
    "premium ceramic cup",
    "crypto merch mug",
    "blockchain merchandise india",
    "mst branded mug",
    "white ceramic mug",
    "office coffee mug",
    "home coffee cup",
    "tea and coffee mug",
    "durable ceramic mug",
    "glossy white mug",
    "coffee lover mug",
    "daily use mug",
    "stylish ceramic cup",
    "modern design mug",
    "premium mug under 200",
    "hot beverage mug",
    "drinkware for office",
    "corporate coffee mug",
    "tech community merchandise",
    "crypto-themed mug",
    "blockchain gift item",
    "lightweight ceramic mug",
    "dishwasher safe mug",
    "heat-resistant mug",
    "minimal design coffee cup",
    "matte finish ceramic cup",
    "printed ceramic mug for men and women",
    "tea mug with handle",
    "reusable ceramic drinkware",
    "ceramic cup",
    "coffee cup",
    "tea mug",
    "drinkware",
    "ceramic",
    "coffee",
    "tea",
    "hot beverage",
    "mug",
    "office",
    "corporate",
    "cup",
    "white",
    "glossy",
    "durable",
    "daily",
    "stylish",
    "modern",
    "premium",
    "hot",
    "drink",
    "tech",
    "crypto",
    "lightweight",
    "dishwasher",
    "heat",
    "minimal",
    "matte",
    "printed",
    "reusable",
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
    "executive journal",
    "executive notebook",
    "executive planner",
    "office diary",
    "office notebook",
    "corporate diary",
    "corporate journal",
    "gift diary",
    "gifting notebook",
    "premium diary",
    "premium journal",
    "luxury diary",
    "meeting notes book",
    "professional diary",
    "daily log book",
    "planner diary",
    "agenda book",
    "business diary",
    "business notebook",
    "company diary",
    "mst blockchain executive diary",
    "premium executive diary",
    "blockchain branded diary",
    "mst logo diary",
    "office diary for professionals",
    "corporate diary",
    "leather finish diary",
    "stylish notebook for office",
    "hardbound executive diary",
    "daily notes diary",
    "premium business diary",
    "professional writing notebook",
    "grey office diary",
    "corporate gifting diary",
    "diary with magnetic lock",
    "designer diary for men and women",
    "personal organizer diary",
    "meeting notes diary",
    "business planner diary",
    "office stationery diary",
    "premium diary under 300",
    "high-quality writing journal",
    "durable hardcover diary",
    "blockchain merchandise india",
    "tech community merchandise",
    "mst branded stationery",
    "professional note-taking book",
    "elegant office diary",
    "classy corporate notebook",
    "everyday writing diary",
    "business notebook for executives",
    "professional planner book",
    "minimal design diary",
    "mst blockchain executive diary and pen set",
    "premium diary pen combo",
    "mst logo diary set",
    "blockchain branded stationery set",
    "executive diary with pen",
    "corporate diary gift set",
    "professional writing set",
    "leather finish diary",
    "hardbound office diary",
    "premium ball pen included",
    "stylish office diary",
    "business planner diary set",
    "corporate gifting combo",
    "elegant diary and pen gift pack",
    "professional notebook with pen",
    "grey executive diary",
    "daily notes diary set",
    "business organizer with pen",
    "premium stationery under 350",
    "tech community merchandise",
    "mst branded pen",
    "luxury writing pen and diary combo",
    "minimal design diary set",
    "diary with magnetic lock",
    "office stationery gift set",
    "meeting notes diary with pen",
    "diary for men and women",
    "high-quality writing journal combo",
    "corporate employee gift",
    "notebook and pen set",
    "premium executive stationery kit",
    "blockchain merchandise india",
    "combo",
    "set",
    "gift set",
    "pen",
    "combo",
    "kit",
    "pack",
    "mst",
    "blockchain",
    "executive",
    "premium",
    "diary",
    "notebook",
    "planner",
    "organizer",
    "office",
    "corporate",
    "business",
    "writing",
    "journal",
    "stationery",
    "hardcover",
    "leather",
    "magnetic",
    "grey",
    "minimal",
    "elegant",
    "diary",
    "journal",
    "notebook",
    "planner",
    "agenda",
    "premium",
    "corporate",
    "executive",
    "office",
    "gift",
    "leather",
    "book",
    "notepad",
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
    "journal",
    "planner",
    "agenda",
    "daily diary",
    "study notebook",
    "college notebook",
    "writing journal",
    "personal diary",
    "travel diary",
    "work notebook",
    "office notebook",
    "spiral notebook",
    "lined diary",
    "hardcover diary",
    "softcover diary",
    "sketch notebook",
    "bullet journal",
    "school notebook",
    "notes book",
    "stationery",
    "paper",
    "pages",
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
    "pens",
    "writing pen",
    "writing instrument",
    "ballpoint pen",
    "roller pen",
    "gel pen",
    "metal ball pen",
    "executive pen",
    "premium pen",
    "office stationery pen",
    "corporate gifting pen",
    "logo pen",
    "engraved pen",
    "stylish pen",
    "luxury pen",
    "smooth writing pen",
    "daily use pen",
    "signature instrument",
    "ink pen",
    "refillable pen",
    "stationery pen",
    "office",
    "corporate",
    "premium",
    "writing",
    "signature",
    "mst blockchain executive pen",
    "premium executive pen",
    "mst logo pen",
    "blockchain branded pen",
    "luxury writing pen",
    "black and gold pen",
    "professional ball pen",
    "stylish office pen",
    "high-quality writing instrument",
    "smooth writing pen",
    "corporate gifting pen",
    "signature pen for professionals",
    "metal body pen",
    "durable executive pen",
    "elegant office stationery",
    "premium pen under 100",
    "designer pen for men and women",
    "business pen for office use",
    "mst branded stationery",
    "tech community merchandise",
    "corporate office pen",
    "classy writing pen",
    "professional signature pen",
    "office stationery pen",
    "everyday writing pen",
    "premium black executive pen",
    "minimal design pen",
    "blockchain merchandise india",
    "luxury corporate pen",
    "affordable professional pen",
    "gift pen for employees",
    "sleek modern pen design",
    "mst",
    "blockchain",
    "executive",
    "luxury",
    "black",
    "gold",
    "professional",
    "stylish",
    "high-quality",
    "durable",
    "elegant",
    "designer",
    "business",
    "office",
    "classy",
    "minimal",
    "sleek",
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
    "white hat",
    "white baseball cap",
    "white sports cap",
    "white brim cap",
    "polo cap",
    "polo hat",
    "logo hat",
    "company cap",
    "corporate hat",
    "branded hat",
    "merch cap",
    "crypto cap",
    "blockchain cap",
    "summer cap",
    "sun cap",
    "casual cap",
    "daily wear cap",
    "men's white cap",
    "women's white cap",
    "unisex white cap",
    "adjustable hat",
    "snapback cap",
    "velcro cap",
    "lightweight cap",
    "breathable cap",
    "cotton hat",
    "mst blockchain white logo cap",
    "white cap for men",
    "stylish cap",
    "mst logo hat",
    "blockchain branded cap",
    "crypto merch cap",
    "premium white topi",
    "casual hat for men",
    "sports cap white",
    "outdoor cap",
    "fashion cap for boys",
    "trendy white cap india",
    "cotton cap for summer",
    "branded logo cap",
    "tech community merchandise",
    "blockchain merchandise india",
    "unisex white hat",
    "stylish topi for men",
    "cool cap for college boys",
    "modern design cap",
    "premium cap under 200",
    "casual wear hat",
    "gym cap",
    "running cap white",
    "travel cap for men",
    "minimal design logo cap",
    "summer topi",
    "caps for men fashion",
    "outdoor sports topi",
    "stylish baseball hat",
    "branded white marker cap",
    "mst",
    "blockchain",
    "logo",
    "topi",
    "summer",
    "fashion",
    "trendy",
    "casual",
    "gym",
    "running",
    "travel",
    "minimal",
    "modern",
    "premium",
    "stylish",
    "white",
    "cap",
    "hat",
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
  const queryTokens = tokenizeValue(normalizedQuery);
  const queryTokenCount = queryTokens.length || 1;
  const effectiveKeywordThreshold =
    queryTokenCount === 1
      ? Math.min(KEYWORD_MATCH_THRESHOLD, 0.52)
      : KEYWORD_MATCH_THRESHOLD;

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

    if (bestScore >= effectiveKeywordThreshold) {
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
    effectiveKeywordThreshold,
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
  const requestSequenceRef = useRef(0);

  // Memoize the search function to prevent unnecessary re-renders
  const searchProducts = useCallback(
    async (query) => {
      const requestId = requestSequenceRef.current + 1;
      requestSequenceRef.current = requestId;
      const trimmedQuery = query.trim();

      // If the query is empty, clear results
      if (!trimmedQuery) {
        if (activeRequestRef.current) {
          activeRequestRef.current.abort();
          activeRequestRef.current = null;
        }
        setSearchQuery("");
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

      let categoryFilters = selectedCategoryMatches.map(
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

      if (trimmedQuery) {
        searchPhrases.add(trimmedQuery);
      }

      matchedProducts.slice(0, 5).forEach(({ matchedItem, score }) => {
        if (score >= KEYWORD_MATCH_THRESHOLD) {
          searchPhrases.add(matchedItem);
        }
      });

      selectedCategoryMatches.forEach(({ matchedItem, score }) => {
        if (score >= CATEGORY_FILTER_THRESHOLD) {
          searchPhrases.add(matchedItem);
        }
      });

      if (searchPhrases.size === 0 && matchedKeywords.length > 0) {
        matchedKeywords.slice(0, 3).forEach((keyword) => {
          if (keyword) {
            searchPhrases.add(keyword);
          }
        });
      }

      const expandedSearchTerm = Array.from(searchPhrases)
        .filter(Boolean)
        .join(" ")
        .trim();

      const finalSearchTerm =
        expandedSearchTerm || normalizedBaseTerm || trimmedQuery;

      // If the effective query is entirely satisfied by keyword matches (for
      // example, searching for a single color like "white"), the base term is
      // empty. In those cases, the matched products already capture the intent,
      // so applying category filters can over-constrain the search and return no
      // results. Drop category filters when there is no residual search phrase.
      if (!baseWithoutKeywords && searchPhrases.size > 0) {
        categoryFilters = [];
      }

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
        if (requestSequenceRef.current === requestId) {
          setIsSearching(false);
        }
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

        const phraseCandidates = Array.from(searchPhrases).filter(Boolean);

        const performSearchRequest = async (searchValue) =>
          fetchProducts(
            {
              ...params,
              search: searchValue,
            },
            {
              signal: abortController.signal,
              timeout: SEARCH_REQUEST_TIMEOUT_MS,
            }
          );

        const primaryResponse = await performSearchRequest(finalSearchTerm);
        let data = primaryResponse?.data || [];

        if ((!data || data.length === 0) && phraseCandidates.length > 1) {
          const seen = new Map();
          data.forEach((product) => {
            const key = product?._id || product?.id || product?.slug;
            if (key != null) {
              seen.set(key, product);
            }
          });

          for (const phrase of phraseCandidates) {
            if (!phrase || phrase === finalSearchTerm) {
              continue;
            }

            try {
              const altResponse = await performSearchRequest(phrase);
              const altData = altResponse?.data || [];
              altData.forEach((product) => {
                const key = product?._id || product?.id || product?.slug;
                if (key != null && !seen.has(key)) {
                  seen.set(key, product);
                }
              });

              if (seen.size >= 10) {
                break;
              }
            } catch (altError) {
              if (!isRequestCanceled(altError)) {
                console.warn(
                  "Search fallback failed for phrase",
                  phrase,
                  altError
                );
              }
            }
          }

          data = Array.from(seen.values());
        }

        if (requestSequenceRef.current !== requestId) {
          return {
            products: data || [],
            keywordMatches: matches,
          };
        }

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

        if (!isCanceled && requestSequenceRef.current === requestId) {
          console.error("Search error:", error);
          setSearchResults([]);
          searchResultsRef.current = [];
          setKeywordMatches([]);
          keywordMatchesRef.current = [];
        }

        return [];
      } finally {
        if (
          activeRequestRef.current === abortController &&
          requestSequenceRef.current === requestId
        ) {
          activeRequestRef.current = null;
          setIsSearching(false);
        }
      }
    },
    [lastSearchQuery]
  );

  const clearSearch = useCallback(() => {
    requestSequenceRef.current += 1;
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
