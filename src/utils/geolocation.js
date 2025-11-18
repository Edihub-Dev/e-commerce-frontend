const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const defaultParams = {
  format: "jsonv2",
  addressdetails: "1",
};

const truncate = (value, max = 255) => {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}` : value;
};

const buildQueryString = (params) =>
  new URLSearchParams({ ...defaultParams, ...params }).toString();

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Location service unavailable. Please try again.");
  }

  const data = await response.json();
  if (!data) {
    throw new Error("Invalid response from location service");
  }

  return data;
};

const normalizeAddress = (address = {}) => {
  const {
    house_number: houseNumber,
    building,
    house,
    house_name: houseName,
    building_name: buildingName,
    apartment,
    residential,
    commercial,
    industrial,
    road,
    pedestrian,
    footway,
    neighbourhood,
    quarter,
    suburb,
    village,
    hamlet,
    town,
    city,
    amenity,
    shop,
    tourism,
    leisure,
    man_made: manMade,
    public_building: publicBuilding,
    name,
    state,
    state_district: stateDistrict,
    postcode,
    country,
  } = address;

  const locality =
    city || town || village || suburb || neighbourhood || hamlet || "";

  const pinCodeValue = postcode || "";

  const addressSegments = [];
  const dedupePush = (value) => {
    const trimmed = typeof value === "string" ? value.trim() : value;
    if (!trimmed) return;
    if (!addressSegments.includes(trimmed)) {
      addressSegments.push(trimmed);
    }
  };

  const buildingInfo = [houseNumber, house, apartment, building]
    .filter(Boolean)
    .join(" ");
  const namedBuildingInfo = [houseName, buildingName, name]
    .filter(Boolean)
    .join(", ");
  const complexInfo = [residential, commercial, industrial]
    .filter(Boolean)
    .join(", ");
  const streetInfo = [road, pedestrian, footway].filter(Boolean).join(", ");
  const areaInfo = [neighbourhood, quarter, suburb].filter(Boolean).join(", ");
  const landmarkInfo = [
    amenity,
    shop,
    publicBuilding,
    manMade,
    tourism,
    leisure,
  ]
    .filter(Boolean)
    .join(", ");

  [
    buildingInfo,
    namedBuildingInfo,
    complexInfo,
    streetInfo,
    areaInfo,
    landmarkInfo,
  ].forEach(dedupePush);

  const displayParts = (address.display_name || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  while (addressSegments.length < 4 && displayParts.length) {
    dedupePush(displayParts.shift());
  }

  const addressLine = addressSegments.length
    ? addressSegments.slice(0, 6).join(", ")
    : displayParts[0] || "";

  const stateLike = state || stateDistrict || "";
  const cityState = [locality, stateLike].filter(Boolean).join(", ");
  const pinTail = pinCodeValue
    ? cityState
      ? `${cityState} - ${pinCodeValue}`
      : pinCodeValue
    : cityState;
  const formattedAddress = [addressLine, pinTail, country]
    .filter(Boolean)
    .join(", ");

  return {
    addressLine: truncate(addressLine, 255),
    city: locality,
    state: state || stateDistrict || "",
    pincode: pinCodeValue,
    formattedAddress: truncate(formattedAddress || address.display_name),
    country: country || "",
  };
};

export const reverseGeocode = async (latitude, longitude) => {
  const query = buildQueryString({ lat: latitude, lon: longitude });
  const url = `${NOMINATIM_BASE_URL}/reverse?${query}`;
  const data = await fetchJson(url);
  if (!data?.address) {
    throw new Error("Unable to determine address from current location");
  }

  const normalized = normalizeAddress({
    ...data.address,
    display_name: data.display_name,
  });
  return {
    latitude,
    longitude,
    ...normalized,
  };
};

export const forwardGeocode = async (addressQuery) => {
  if (!addressQuery?.trim()) {
    throw new Error("Address query is required for location lookup");
  }

  const query = buildQueryString({ q: addressQuery, limit: "1" });
  const url = `${NOMINATIM_BASE_URL}/search?${query}`;
  const [firstResult] = await fetchJson(url);

  if (!firstResult) {
    return null;
  }

  const latitude = Number(firstResult.lat);
  const longitude = Number(firstResult.lon);
  const normalized = normalizeAddress({
    ...firstResult.address,
    display_name: firstResult.display_name,
  });

  return {
    latitude,
    longitude,
    ...normalized,
  };
};

export const buildAddressQuery = ({ addressLine, city, state, pincode }) => {
  return [addressLine, city, state, pincode].filter(Boolean).join(", ");
};
