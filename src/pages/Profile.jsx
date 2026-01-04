import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, MapPin, PencilLine } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../contexts/AuthContext";
import { fetchAddresses, updateAddress } from "../utils/api";
import { pageVariants, scaleIn } from "../utils/animations";
import { STATE_OPTIONS, getCitiesForState } from "../constants/indiaLocations";
import {
  fetchLocationByPincode,
  verifyAddressWithPostalApi,
  doesAddressMatchLocation,
} from "../utils/postalLookup";

const createInitialFormState = () => ({
  fullName: "",
  mobile: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
});

const MOBILE_REGEX = /^[6-9]\d{9}$/;
const LOCATION_REGEX = /^[A-Za-z\s.'-]{2,}$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

const fetchGeoCoordinates = async ({ city, state, pincode }) => {
  try {
    const query = encodeURIComponent(
      `${pincode || ""} ${city || ""} ${state || ""} India`
    );
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=1&countrycodes=in&q=${query}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    if (!Array.isArray(results) || !results.length) {
      return null;
    }

    const bestMatch = results[0];
    const latitude = Number(bestMatch.lat);
    const longitude = Number(bestMatch.lon);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return {
      latitude,
      longitude,
      formattedAddress: bestMatch.display_name,
    };
  } catch (_error) {
    return null;
  }
};

const validateAddressForm = (formState) => {
  const errors = [];

  const fullName = String(formState.fullName || "").trim();
  if (!fullName || fullName.length < 2) {
    errors.push("Enter the recipient's full name.");
  }

  const addressLine = String(formState.addressLine || "").trim();
  if (!addressLine || addressLine.length < 5) {
    errors.push("Enter a complete address line (min 5 characters).");
  }

  const mobile = String(formState.mobile || "").trim();
  if (!MOBILE_REGEX.test(mobile)) {
    errors.push("Enter a valid 10-digit mobile number starting with 6-9.");
  }

  const city = String(formState.city || "").trim();
  if (!LOCATION_REGEX.test(city)) {
    errors.push("Enter a valid city name using only letters.");
  }

  const state = String(formState.state || "").trim();
  if (!LOCATION_REGEX.test(state)) {
    errors.push("Enter a valid state name using only letters.");
  }

  const pincode = String(formState.pincode || "").trim();
  if (!PINCODE_REGEX.test(pincode)) {
    errors.push("Enter a valid 6-digit PIN code.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formState, setFormState] = useState(createInitialFormState);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [accountNameInput, setAccountNameInput] = useState(user?.name || "");
  const [accountMobileInput, setAccountMobileInput] = useState(
    user?.mobile ? user.mobile.replace(/\D/g, "").slice(-10) : ""
  );
  const [accountSaving, setAccountSaving] = useState(false);
  const lastResolvedPincodeRef = useRef("");

  const cityOptions = useMemo(() => {
    const cities = getCitiesForState(formState.state) || [];
    if (formState.city && cities.length && !cities.includes(formState.city)) {
      return [...cities, formState.city];
    }
    return cities;
  }, [formState.state, formState.city]);

  const normalizeForMatch = (value = "") =>
    value
      .toString()
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();

  const resolveStateName = (candidate = "") => {
    if (!candidate) {
      return "";
    }
    const normalizedCandidate = normalizeForMatch(candidate);
    const matched = STATE_OPTIONS.find(
      (option) => normalizeForMatch(option) === normalizedCandidate
    );
    return matched || candidate;
  };

  useEffect(() => {
    const loadAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const response = await fetchAddresses();
        const data = Array.isArray(response)
          ? response
          : response?.data?.data || response?.data || [];
        setAddresses(data);
      } catch (error) {
        console.error("Failed to fetch addresses", error);
        toast.error(error.message || "Failed to load saved addresses.");
      } finally {
        setLoadingAddresses(false);
      }
    };

    loadAddresses();
  }, []);

  useEffect(() => {
    setAccountNameInput(user?.name || "");
    setAccountMobileInput(
      user?.mobile ? user.mobile.replace(/\D/g, "").slice(-10) : ""
    );
  }, [user]);

  useEffect(() => {
    const trimmedPincode = String(formState.pincode || "").trim();

    if (
      !PINCODE_REGEX.test(trimmedPincode) ||
      trimmedPincode === lastResolvedPincodeRef.current
    ) {
      return;
    }

    let isActive = true;
    lastResolvedPincodeRef.current = trimmedPincode;

    const resolveLocation = async () => {
      const lookup = await fetchLocationByPincode(trimmedPincode);

      if (!isActive) {
        return;
      }

      if (!lookup.success) {
        toast.error(lookup.message);
        return;
      }

      const resolvedState = resolveStateName(lookup.data.state);
      const resolvedCity = (lookup.data.city || "").trim();
      const suggestedAddressLine =
        lookup.data.addressLineSuggestion?.trim() || "";

      if (!resolvedState && !resolvedCity) {
        return;
      }

      setFormState((previous) => {
        const nextState = resolvedState || previous.state;
        const nextCity = resolvedCity || previous.city;
        const shouldUpdateAddressLine =
          suggestedAddressLine &&
          (!previous.addressLine ||
            !doesAddressMatchLocation(previous.addressLine, {
              city: nextCity,
              state: nextState,
            }));

        if (previous.state === nextState && previous.city === nextCity) {
          if (!shouldUpdateAddressLine) {
            return previous;
          }
        }

        return {
          ...previous,
          state: nextState,
          city: nextCity,
          ...(shouldUpdateAddressLine
            ? { addressLine: suggestedAddressLine }
            : {}),
        };
      });
    };

    resolveLocation();

    return () => {
      isActive = false;
    };
  }, [formState.pincode]);

  const startEditing = (address) => {
    setEditingAddressId(address._id || address.id);
    setFormState({
      fullName: address.fullName || "",
      mobile: address.mobile || "",
      addressLine: address.addressLine || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || "",
    });
  };

  const cancelEditing = () => {
    setEditingAddressId(null);
    setFormState(createInitialFormState());
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setFormState((previous) => ({
      ...previous,
      [name]: value,
      ...(name === "state" && previous.state !== value ? { city: "" } : {}),
    }));
  };

  const handleUpdateAddress = async (event) => {
    event.preventDefault();
    if (!editingAddressId) {
      return;
    }

    const validation = validateAddressForm(formState);
    if (!validation.isValid) {
      validation.errors.forEach((message) => toast.error(message));
      return;
    }

    setSaving(true);

    const payload = {
      fullName: formState.fullName.trim(),
      mobile: formState.mobile.trim(),
      addressLine: formState.addressLine.trim(),
      city: formState.city.trim(),
      state: formState.state.trim(),
      pincode: formState.pincode.trim(),
    };

    try {
      const mapValidation = await verifyAddressWithPostalApi(payload);
      if (!mapValidation.success) {
        toast.error(mapValidation.message);
        setSaving(false);
        return;
      }

      payload.state = mapValidation.data.state;
      payload.city = mapValidation.data.city;

      if (
        !doesAddressMatchLocation(payload.addressLine, {
          city: payload.city,
          state: payload.state,
        })
      ) {
        toast.error(
          "Address line must include the resolved city and state for this PIN."
        );
        setSaving(false);
        return;
      }

      const geoCoordinates = await fetchGeoCoordinates(payload);
      if (geoCoordinates) {
        payload.latitude = geoCoordinates.latitude;
        payload.longitude = geoCoordinates.longitude;
        payload.formattedAddress = geoCoordinates.formattedAddress;
        payload.isGeoVerified = true;
      }

      const response = await updateAddress(editingAddressId, payload);
      const data = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];

      setAddresses(data);
      toast.success("Address updated successfully.");
      cancelEditing();
    } catch (error) {
      console.error("Failed to update address", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to update address."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleAccountDetailsSubmit = async (event) => {
    event.preventDefault();
    const trimmedName = accountNameInput.trim();
    if (trimmedName.length < 2) {
      toast.error("Name must be at least 2 characters.");
      return;
    }

    const normalizedMobile = accountMobileInput.replace(/\D/g, "").slice(-10);
    if (!MOBILE_REGEX.test(normalizedMobile)) {
      toast.error("Enter a valid 10-digit mobile number starting with 6.");
      return;
    }

    const payload = {};
    if (trimmedName !== user?.name) {
      payload.name = trimmedName;
    }
    if (normalizedMobile !== user?.mobile) {
      payload.mobile = normalizedMobile;
    }

    if (!Object.keys(payload).length) {
      toast.info("No changes to save.");
      setIsEditingAccount(false);
      return;
    }

    setAccountSaving(true);
    try {
      await updateProfile(payload);
      setIsEditingAccount(false);
    } catch (error) {
      console.error("Failed to update profile name", error);
    } finally {
      setAccountSaving(false);
    }
  };

  return (
    <motion.div
      className="container mx-auto px-4 py-10 sm:py-12 lg:py-16"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.h1
        className="mb-8 text-3xl font-bold text-secondary"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        My Profile
      </motion.h1>

      <div className="grid gap-6 lg:grid-cols-[1fr,2fr] lg:gap-8 lg:items-start">
        <motion.div
          className="self-start rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          variants={scaleIn}
          initial="initial"
          animate="animate"
        >
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-secondary">
                  Account
                </h2>
              </div>
              {!isEditingAccount && (
                <button
                  type="button"
                  onClick={() => setIsEditingAccount(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20"
                >
                  <PencilLine className="h-4 w-4" />
                </button>
              )}
            </div>

            {isEditingAccount ? (
              <form onSubmit={handleAccountDetailsSubmit} className="space-y-4">
                <label className="text-sm font-medium text-secondary/80">
                  Name
                  <input
                    value={accountNameInput}
                    onChange={(event) =>
                      setAccountNameInput(event.target.value)
                    }
                    className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="Enter your name"
                    maxLength={100}
                  />
                </label>
                <label className="text-sm font-medium text-secondary/80">
                  Mobile Number
                  <div className="mt-2 flex w-full rounded-lg border border-slate-200 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
                    <span className="inline-flex items-center rounded-l-lg bg-slate-100 px-3 text-sm text-secondary/70">
                      +91
                    </span>
                    <input
                      value={accountMobileInput}
                      onChange={(event) => {
                        const digitsOnly = event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10);
                        setAccountMobileInput(digitsOnly);
                      }}
                      className="flex-1 rounded-r-lg border-0 px-3 py-2 text-sm focus:outline-none"
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </label>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-secondary hover:bg-slate-50"
                    onClick={() => {
                      setIsEditingAccount(false);
                      setAccountNameInput(user?.name || "");
                      setAccountMobileInput(
                        user?.mobile
                          ? user.mobile.replace(/\D/g, "").slice(-10)
                          : ""
                      );
                    }}
                    disabled={accountSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={accountSaving}
                  >
                    {accountSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <dl className="grid gap-3 text-sm text-medium-text">
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="font-medium text-secondary/80">Name:</dt>
                  <dd className="text-secondary text-base">
                    {user?.name || "-"}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="font-medium text-secondary/80">Email:</dt>
                  <dd className="select-text text-secondary">
                    {user?.email || "-"}
                  </dd>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <dt className="font-medium text-secondary/80">Mobile:</dt>
                  <dd className="text-secondary">
                    {user?.mobile
                      ? user.mobile.startsWith("+")
                        ? user.mobile
                        : `+91 ${user.mobile}`
                      : "-"}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </motion.div>

        <motion.div
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          variants={scaleIn}
          initial="initial"
          animate="animate"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-secondary">
                Saved Addresses
              </h2>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {loadingAddresses ? (
              <div className="flex items-center justify-center rounded-xl border border-slate-100 bg-slate-50 py-10 text-sm text-medium-text">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                Loading saved addresses...
              </div>
            ) : addresses.length ? (
              addresses.map((address) => {
                const addressId = address._id || address.id;
                const isEditing = editingAddressId === addressId;

                return (
                  <motion.div
                    key={addressId}
                    variants={scaleIn}
                    initial="initial"
                    animate="animate"
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    {isEditing ? (
                      <form
                        className="space-y-4"
                        onSubmit={handleUpdateAddress}
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="text-sm font-medium text-secondary/80">
                            Full Name
                            <input
                              name="fullName"
                              value={formState.fullName}
                              onChange={handleFormChange}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="Recipient name"
                            />
                          </label>
                          <label className="text-sm font-medium text-secondary/80">
                            Mobile Number
                            <input
                              name="mobile"
                              value={formState.mobile}
                              onChange={handleFormChange}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="10-digit mobile"
                              maxLength={10}
                            />
                          </label>
                        </div>
                        <label className="text-sm font-medium text-secondary/80">
                          Address
                          <textarea
                            name="addressLine"
                            value={formState.addressLine}
                            onChange={handleFormChange}
                            className="mt-2 h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            placeholder="House number, street, locality"
                          />
                        </label>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="text-sm font-medium text-secondary/80">
                            State
                            <select
                              name="state"
                              value={formState.state}
                              onChange={handleFormChange}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                            >
                              <option value="">Select state</option>
                              {STATE_OPTIONS.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-secondary/80">
                            City
                            <select
                              name="city"
                              value={formState.city}
                              onChange={handleFormChange}
                              disabled={!formState.state}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-slate-100"
                            >
                              <option value="">
                                {formState.state
                                  ? "Select city"
                                  : "Select state first"}
                              </option>
                              {cityOptions.map((city) => (
                                <option key={city} value={city}>
                                  {city}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-sm font-medium text-secondary/80 md:col-span-1">
                            PIN Code
                            <input
                              name="pincode"
                              value={formState.pincode}
                              onChange={handleFormChange}
                              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                              placeholder="6-digit PIN"
                              maxLength={6}
                            />
                          </label>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                          <button
                            type="button"
                            onClick={cancelEditing}
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-secondary hover:bg-slate-50"
                            disabled={saving}
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {saving ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save changes"
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-secondary">
                              {address.fullName}
                            </p>
                            {address.mobile ? (
                              <p className="text-sm text-medium-text">
                                Phone: {address.mobile}
                              </p>
                            ) : null}
                            <p className="text-xs text-slate-400">
                              Email: {address.email || user?.email || "-"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditing(address)}
                            className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
                          >
                            <PencilLine className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex items-start gap-2 text-sm text-medium-text">
                          <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                          <div>
                            <p>{address.addressLine}</p>
                            <p>
                              {address.city}, {address.state} -{" "}
                              {address.pincode}
                            </p>
                          </div>
                        </div>
                        {address.isGeoVerified ? (
                          <p className="text-xs font-medium text-emerald-600">
                            ✓ Location verified
                          </p>
                        ) : null}
                      </div>
                    )}
                  </motion.div>
                );
              })
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-sm text-medium-text">
                No saved addresses yet. Add one during checkout to see it here.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Profile;
