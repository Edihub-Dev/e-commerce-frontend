// Curated pincode data for consistent autofill suggestions.
// Extend this map whenever you have vetted address information from reliable sources.
// Each pincode entry mirrors the structure returned by https://api.postalpincode.in/pincode.
//
// Required fields per record:
// - Name: locality or post office name
// - District, State: canonical spellings (match how customers expect to see them)
// - Division, Region, Circle: postal hierarchy helping us craft meaningful narrative addresses
// - BranchType: e.g. "Sub Office", "Head Office", "Branch Office" (used for building descriptors)
// - Block/Taluk: sub-district information, improves road strings in buildAddressLineSuggestion
//
// To add a new PIN:
// 1. Copy the structure below and adjust values.
// 2. Keep text in proper case (title case for locality names, uppercase for abbreviations if required).
// 3. If multiple delivery sub-offices share the same PIN, add multiple entries in the array.
// 4. Rebuild the frontend so the latest dataset ships with the bundle.
//
// Example trusted references: India Post official site, state government GIS portals, verified delivery logs.

const PINCODE_DATA = {
  110001: [
    {
      Name: "Connaught Place",
      BranchType: "Head Office",
      DeliveryStatus: "Delivery",
      Circle: "Delhi",
      District: "New Delhi",
      Division: "New Delhi Central",
      Region: "Delhi",
      State: "Delhi",
      Block: "New Delhi",
      Taluk: "New Delhi",
    },
  ],
  302020: [
    {
      Name: "Mansarovar",
      BranchType: "Sub Office",
      DeliveryStatus: "Delivery",
      Circle: "Rajasthan",
      District: "Jaipur",
      Division: "Jaipur City",
      Region: "Jaipur HQ",
      State: "Rajasthan",
      Block: "Sanganer",
      Taluk: "Jaipur",
    },
  ],
  302021: [
    {
      Name: "Lalarpura",
      BranchType: "Branch Office",
      DeliveryStatus: "Delivery",
      Circle: "Rajasthan",
      District: "Jaipur",
      Division: "Jaipur City",
      Region: "Jaipur HQ",
      State: "Rajasthan",
      Block: "Sanganer",
      Taluk: "Jaipur",
    },
  ],
  400001: [
    {
      Name: "Mumbai G.P.O.",
      BranchType: "Head Office",
      DeliveryStatus: "Delivery",
      Circle: "Maharashtra",
      District: "Mumbai",
      Division: "Mumbai",
      Region: "Mumbai",
      State: "Maharashtra",
      Block: "Fort",
      Taluk: "Mumbai",
    },
  ],
  560001: [
    {
      Name: "Bangalore G.P.O.",
      BranchType: "Head Office",
      DeliveryStatus: "Delivery",
      Circle: "Karnataka",
      District: "Bengaluru",
      Division: "Bengaluru East",
      Region: "Bengaluru HQ",
      State: "Karnataka",
      Block: "Bengaluru North",
      Taluk: "Bengaluru",
    },
  ],
};

export const findPincodeDetails = (pincode) => {
  const key = String(pincode || "").trim();
  if (!key) {
    return null;
  }
  const records = PINCODE_DATA[key];
  return Array.isArray(records) && records.length
    ? records.map((record) => ({ ...record }))
    : null;
};

export const listSupportedPincodes = () => Object.keys(PINCODE_DATA);

export default PINCODE_DATA;
