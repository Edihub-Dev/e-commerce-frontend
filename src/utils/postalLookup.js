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

const buildAddressLineSuggestion = (office, pincode) => {
  if (!office) {
    return "";
  }

  const parts = [];

  addUniquePart(parts, office.Name);
  addUniquePart(parts, office.Block);
  addUniquePart(parts, office.Taluk);
  addUniquePart(parts, office.District);

  if (office.State) {
    const stateComponent = pincode
      ? `${normalizeWhitespace(office.State)} - ${normalizeWhitespace(pincode)}`
      : normalizeWhitespace(office.State);
    addUniquePart(parts, stateComponent);
  } else if (pincode) {
    addUniquePart(parts, pincode);
  }

  return parts.join(", ");
};

const fetchPostalDetails = async (rawPincode) => {
  const trimmedPincode = String(rawPincode || "").trim();

  if (!trimmedPincode) {
    return {
      success: false,
      message: "Pincode is required.",
      postOffices: [],
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
      postOffices: result.PostOffice,
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
