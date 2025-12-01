import { City, State } from "country-state-city";

const COUNTRY_CODE = "IN";

const rawStates = State.getStatesOfCountry(COUNTRY_CODE) || [];

const createStateEntry = (state) => {
  const cities = City.getCitiesOfState(COUNTRY_CODE, state.isoCode)
    .map((city) => city.name)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  return {
    name: state.name,
    isoCode: state.isoCode,
    cities,
  };
};

export const INDIAN_STATES = rawStates
  .map(createStateEntry)
  .sort((a, b) => a.name.localeCompare(b.name));

export const STATE_OPTIONS = INDIAN_STATES.map((entry) => entry.name);

export const getCitiesForState = (stateName) => {
  if (!stateName) {
    return [];
  }
  const entry = INDIAN_STATES.find((state) => state.name === stateName);
  return entry ? entry.cities : [];
};
