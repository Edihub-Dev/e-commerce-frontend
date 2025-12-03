import { findPincodeDetails } from "../data/pincodeDataset";

const PINCODE_ENDPOINT = (pincode) =>
  `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`;

const normalizeWhitespace = (value = "") =>
  value.toString().trim().replace(/\s+/g, " ");

const normalizeLocation = (value = "") =>
  normalizeWhitespace(value).toLowerCase();

const addUniquePart = (parts, value) => {
  const cleaned = normalizeWhitespace(value);
  if (!cleaned) {
    return;
  }

  const alreadyExists = parts.some(
    (part) => part.toLowerCase() === cleaned.toLowerCase()
  );

  if (!alreadyExists) {
    parts.push(cleaned);
  }
};

const ensureMinimumWords = (value, minimum = 12) => {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length >= minimum) {
    return value;
  }

  const paddingPhrases = [
    "easily reachable for delivery agents",
    "well known to local residents",
    "provides clear guidance for couriers",
    "surrounded by recognizable neighborhood amenities",
    "simple to navigate without repeated phone calls",
  ];

  let enriched = value;
  let index = 0;
  while (enriched.split(/\s+/).filter(Boolean).length < minimum) {
    enriched = `${enriched}, ${paddingPhrases[index % paddingPhrases.length]}`;
    index += 1;
  }

  return enriched;
};

const ADDRESS_LINE_ALLOWED_PATTERN = /[\p{L}\p{N}\s,./-]+/u;
const LATIN_WORD_PATTERN = /^[A-Za-z]+$/;
const DEVANAGARI_WORD_PATTERN = /^[\u0900-\u097F]+$/u;
const COMMON_NO_VOWEL_WORDS = new Set([
  "bldg",
  "nr",
  "blk",
  "stn",
  "rd",
  "flr",
  "apt",
  "gn",
  "sct",
  "sec",
  "opp",
]);

export const validateMeaningfulAddressLine = (
  rawAddressLine,
  { minimumWords = 0, minimumSegments = 5, minSegmentLength = 4 } = {}
) => {
  const addressLine = normalizeWhitespace(rawAddressLine);
  const errors = [];

  if (!addressLine) {
    return {
      isValid: false,
      errors: [
        "Add a detailed address line covering area, nearby landmark, road, building, city, and state.",
      ],
      wordCount: 0,
      suspiciousWords: [],
    };
  }

  if (!ADDRESS_LINE_ALLOWED_PATTERN.test(addressLine)) {
    errors.push(
      "Use only Hindi or English letters, numbers, commas, slashes, hyphens, and spaces in the address line."
    );
  }

  const words = addressLine
    .split(/[\s,]+/)
    .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
    .filter(Boolean);

  const segments = addressLine
    .split(",")
    .map((segment) => normalizeWhitespace(segment))
    .filter(Boolean);

  if (minimumSegments > 0 && segments.length < minimumSegments) {
    errors.push(
      "Structure the address line with area, nearby landmark, road, building, city, and state (use commas to separate each part)."
    );
  }

  const suspiciousWords = [];
  const weakSegments = [];

  words.forEach((word) => {
    const lowercase = word.toLowerCase();

    if (lowercase.length <= 2) {
      return;
    }

    if (/\d/.test(lowercase)) {
      return;
    }

    const stripped = lowercase.replace(/[^a-z\u0900-\u097f]/gu, "");

    if (!stripped) {
      return;
    }

    if (COMMON_NO_VOWEL_WORDS.has(stripped)) {
      return;
    }

    if (DEVANAGARI_WORD_PATTERN.test(stripped)) {
      return;
    }

    if (LATIN_WORD_PATTERN.test(stripped) && !/[aeiou]/.test(stripped)) {
      suspiciousWords.push(word);
    }
  });

  if (suspiciousWords.length) {
    errors.push(
      `Replace gibberish words in the address line: ${suspiciousWords
        .slice(0, 4)
        .join(", ")}.`
    );
  }

  segments.forEach((segment) => {
    if (segment.length < minSegmentLength) {
      weakSegments.push(segment);
      return;
    }

    const segmentWords = segment
      .split(/\s+/)
      .map((token) => token.replace(/^[./-]+|[./-]+$/g, ""))
      .filter(Boolean);

    const hasMeaningfulWord = segmentWords.some((segmentWord) => {
      const lowered = segmentWord.toLowerCase();

      if (DEVANAGARI_WORD_PATTERN.test(segmentWord)) {
        return true;
      }

      if (/\d/.test(lowered)) {
        return true;
      }

      if (
        LATIN_WORD_PATTERN.test(segmentWord) &&
        /[aeiou]/i.test(segmentWord)
      ) {
        return true;
      }

      return false;
    });

    if (!hasMeaningfulWord) {
      weakSegments.push(segment);
    }
  });

  if (weakSegments.length) {
    errors.push(
      `Clarify these address parts so they describe the location clearly: ${weakSegments
        .slice(0, 4)
        .join(", ")}.`
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    wordCount: words.length,
    segmentCount: segments.length,
    suspiciousWords,
  };
};

const buildAddressLineSuggestion = (office, pincode) => {
  if (!office) {
    return "";
  }

  const area = normalizeWhitespace(
    office.Name || office.Block || office.Taluk || office.District || "local"
  );
  const nearby = normalizeWhitespace(
    office.Division || office.Region || office.Circle || "community landmark"
  );
  const road = normalizeWhitespace(
    office.Taluk || office.Block || `${office.District || "city"} main road`
  );
  const buildingType = normalizeWhitespace(
    office.BranchType
      ? `${office.BranchType.toLowerCase()} building`
      : "residential building"
  );
  const city = normalizeWhitespace(office.District || office.Name || "");
  const state = normalizeWhitespace(office.State || "");

  const structuredParts = [
    area ? `${area} area` : null,
    nearby ? `near ${nearby}` : null,
    road ? `along ${road}` : null,
    buildingType,
    city,
    state,
    pincode ? `PIN ${normalizeWhitespace(pincode)}` : null,
    "India",
  ].filter(Boolean);

  const structuredAddress = ensureMinimumWords(structuredParts.join(", "));

  return structuredAddress;
};

const withDefaultPostalFields = (records = [], pincode) =>
  records.map((record) => ({
    Country: record.Country || "India",
    DeliveryStatus: record.DeliveryStatus || "Delivery",
    Pincode: record.Pincode || String(pincode).trim(),
    ...record,
  }));

const fetchPostalDetails = async (rawPincode) => {
  const trimmedPincode = String(rawPincode || "").trim();

  if (!trimmedPincode) {
    return {
      success: false,
      message: "Pincode is required.",
      postOffices: [],
    };
  }

  const localRecords = findPincodeDetails(trimmedPincode);
  if (Array.isArray(localRecords) && localRecords.length) {
    return {
      success: true,
      postOffices: withDefaultPostalFields(localRecords, trimmedPincode),
      source: "static",
    };
  }

  try {
    const response = await fetch(PINCODE_ENDPOINT(trimmedPincode));

    if (!response.ok) {
      throw new Error("Unable to reach postal validation service.");
    }

    const data = await response.json();
    const result = Array.isArray(data) ? data[0] : null;

    if (!result || result.Status !== "Success" || !result.PostOffice?.length) {
      return {
        success: false,
        message: "Pincode is invalid or currently not serviceable.",
        postOffices: [],
      };
    }

    return {
      success: true,
      postOffices: withDefaultPostalFields(result.PostOffice, trimmedPincode),
      source: "remote",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error.message || "Failed to validate address with postal service.",
      postOffices: [],
    };
  }
};

export const verifyAddressWithPostalApi = async ({ pincode, state, city }) => {
  const lookup = await fetchPostalDetails(pincode);

  if (!lookup.success) {
    return lookup;
  }

  const normalizedState = normalizeLocation(state);
  const normalizedCity = normalizeLocation(city);

  const matchedOffice = lookup.postOffices.find((office) => {
    const officeState = normalizeLocation(office.State);
    const officeDistrict = normalizeLocation(office.District);
    const officeName = normalizeLocation(office.Name);

    return (
      officeState === normalizedState &&
      (officeDistrict === normalizedCity || officeName === normalizedCity)
    );
  });

  if (!matchedOffice) {
    const suggestion = lookup.postOffices[0];
    return {
      success: false,
      message: `City/State do not match this PIN code. Try "${
        suggestion?.District || suggestion?.Name || ""
      }, ${suggestion?.State || ""}" for PIN ${String(pincode).trim()}.`,
    };
  }

  return {
    success: true,
    data: {
      state: matchedOffice.State,
      city: matchedOffice.District || matchedOffice.Name,
      postOffice: matchedOffice.Name,
      addressLineSuggestion: buildAddressLineSuggestion(matchedOffice, pincode),
    },
  };
};

export const doesAddressMatchLocation = (rawAddressLine, { city, state }) => {
  if (!rawAddressLine) {
    return false;
  }

  const normalizedAddress = normalizeLocation(rawAddressLine);
  const normalizedState = normalizeLocation(state);
  const normalizedCity = normalizeLocation(city);

  return (
    normalizedAddress.includes(normalizedCity) &&
    normalizedAddress.includes(normalizedState)
  );
};

export const fetchLocationByPincode = async (pincode) => {
  const lookup = await fetchPostalDetails(pincode);

  if (!lookup.success) {
    return lookup;
  }

  const suggestion = lookup.postOffices[0];

  if (!suggestion) {
    return {
      success: false,
      message: "No post offices found for this pincode.",
    };
  }

  return {
    success: true,
    data: {
      state: suggestion.State,
      city: suggestion.District || suggestion.Name,
      postOffice: suggestion.Name,
      addressLineSuggestion: buildAddressLineSuggestion(suggestion, pincode),
    },
  };
};
