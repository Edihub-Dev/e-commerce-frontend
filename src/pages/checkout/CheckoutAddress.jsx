import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import {
  setCheckoutStep,
  setShippingAddress,
} from "../../store/slices/checkoutSlice";
import {
  setAddresses,
  setAddressLoading,
  setAddressError,
} from "../../store/slices/addressSlice";
import {
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
} from "../../utils/api";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  STATE_OPTIONS,
  getCitiesForState,
} from "../../constants/indiaLocations";
import { fetchLocationByPincode } from "../../utils/postalLookup";

const createInitialFormState = (email = "", fullName = "") => ({
  fullName: fullName || "",
  mobile: "",
  email,
  pincode: "",
  state: "",
  city: "",
  addressLine: "",
  alternatePhone: "",
  isDefault: false,
  latitude: null,
  longitude: null,
  formattedAddress: "",
  isGeoVerified: false,
});

const MAX_ADDRESS_LINE_LENGTH = 255;
const MAX_FORMATTED_ADDRESS_LENGTH = 255;
const ADDRESS_DRAFT_STORAGE_KEY = "p2pdeal:checkout:address_draft";
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const TOAST_DURATION = 5500;
const COMMON_NO_VOWEL_ABBREVIATIONS = new Set([
  "bldg",
  "nr",
  "blk",
  "stn",
  "rd",
  "flr",
  "apt",
  "opp",
  "sec",
  "sct",
  "gn",
  "ind",
]);
const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

const isSuspiciousWord = (word) => {
  const cleaned = word
    .toLowerCase()
    .replace(/^[^a-z\u0900-\u097f]+|[^a-z\u0900-\u097f]+$/gu, "");

  if (!cleaned || cleaned.length <= 2) {
    return false;
  }

  if (COMMON_NO_VOWEL_ABBREVIATIONS.has(cleaned)) {
    return false;
  }

  if (DEVANAGARI_RANGE.test(cleaned)) {
    return false;
  }

  return !/[aeiou]/.test(cleaned);
};

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

  const city = String(formState.city || "").trim();
  const addressLine = String(formState.addressLine || "").trim();
  const mobile = String(formState.mobile || "").trim();

  if (!addressLine) {
    errors.push("Enter your address line.");
  }

  if (!city) {
    errors.push("Enter your city.");
  }

  if (addressLine) {
    const suspiciousWords = addressLine
      .split(/[^A-Za-z\u0900-\u097F0-9]+/)
      .filter((token) => token.length >= 3 && !/\d/.test(token))
      .filter(isSuspiciousWord);

    if (suspiciousWords.length) {
      errors.push(
        `Replace unclear words so the address is readable: ${suspiciousWords
          .slice(0, 3)
          .join(", ")}.`
      );
    }
  }

  if (mobile && !MOBILE_REGEX.test(mobile)) {
    errors.push("Enter a valid 10-digit mobile number starting with 6-9.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const CheckoutAddress = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useAuth();
  const customerName = useMemo(
    () => user?.name || user?.username || user?.fullName || "",
    [user?.name, user?.username, user?.fullName]
  );
  const buildInitialFormState = useCallback(
    () => createInitialFormState(user?.email, customerName),
    [user?.email, customerName]
  );
  const { items } = useSelector((state) => state.checkout);
  const { addresses, loading } = useSelector((state) => state.address);
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState(buildInitialFormState);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const lastResolvedPincodeRef = useRef("");
  const isHydratingDraftRef = useRef(true);
  const draftHydratedRef = useRef(false);

  const draftStorageKey = useMemo(() => {
    const identifier =
      user?._id || user?.id || user?.email || user?.phone || "guest";
    return `${ADDRESS_DRAFT_STORAGE_KEY}:${identifier}`;
  }, [user?._id, user?.email, user?.id, user?.phone]);

  const clearDraft = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.removeItem(draftStorageKey);
    } catch (error) {
      console.error("Failed to clear address draft", error);
    }
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === "undefined") {
      isHydratingDraftRef.current = false;
      return;
    }

    isHydratingDraftRef.current = true;

    try {
      const rawDraft = window.localStorage.getItem(draftStorageKey);
      if (!rawDraft) {
        return;
      }

      const parsedDraft = JSON.parse(rawDraft);

      if (parsedDraft?.formState) {
        const mergedFormState = {
          ...buildInitialFormState(),
          ...parsedDraft.formState,
        };
        setFormState(mergedFormState);
        setShowForm(parsedDraft.showForm ?? true);
        setEditingAddressId(parsedDraft.editingAddressId ?? null);
        draftHydratedRef.current = true;
      }
    } catch (error) {
      console.error("Failed to restore address draft", error);
    } finally {
      isHydratingDraftRef.current = false;
    }
  }, [draftStorageKey, buildInitialFormState]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (isHydratingDraftRef.current) {
      return;
    }

    if (!showForm) {
      clearDraft();
      return;
    }

    try {
      window.localStorage.setItem(
        draftStorageKey,
        JSON.stringify({
          formState,
          editingAddressId,
          showForm: true,
          timestamp: Date.now(),
        })
      );
    } catch (error) {
      console.error("Failed to persist address draft", error);
    }
  }, [formState, editingAddressId, showForm, draftStorageKey, clearDraft]);

  const handleResetForm = useCallback(() => {
    setFormState(buildInitialFormState());
    setEditingAddressId(null);
    setShowForm(true);
    clearDraft();
    draftHydratedRef.current = false;
  }, [buildInitialFormState, clearDraft]);

  const handleCancelForm = useCallback(() => {
    setShowForm(false);
    setFormState(buildInitialFormState());
    setEditingAddressId(null);
    clearDraft();
    draftHydratedRef.current = false;
  }, [buildInitialFormState, clearDraft]);

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

  const resolveStateName = useCallback((candidate = "") => {
    if (!candidate) {
      return "";
    }
    const normalizedCandidate = normalizeForMatch(candidate);
    const matched = STATE_OPTIONS.find(
      (option) => normalizeForMatch(option) === normalizedCandidate
    );
    return matched || candidate;
  }, []);

  useEffect(() => {
    dispatch(setCheckoutStep("address"));
    if (!items.length) {
      toast.error("Your checkout session expired. Start again.", {
        duration: TOAST_DURATION,
      });
      navigate("/cart", { replace: true });
    }
  }, [dispatch, items.length, navigate]);

  useEffect(() => {
    if (user?.email) {
      setFormState((prev) => ({
        ...prev,
        email: prev.email || user.email,
      }));
    }
  }, [user?.email]);

  useEffect(() => {
    if (customerName) {
      setFormState((prev) => ({
        ...prev,
        fullName: prev.fullName || customerName,
      }));
    }
  }, [customerName]);

  useEffect(() => {
    const loadAddresses = async () => {
      dispatch(setAddressLoading(true));
      try {
        const response = await fetchAddresses();
        const data = Array.isArray(response)
          ? response
          : response?.data?.data || response?.data || [];
        dispatch(setAddresses(data));
      } catch (error) {
        console.error("Failed to fetch addresses", error);
        dispatch(setAddressError(error.message || "Failed to fetch addresses"));
        toast.error(error.message || "Failed to fetch addresses", {
          duration: TOAST_DURATION,
        });
      } finally {
        dispatch(setAddressLoading(false));
      }
    };

    loadAddresses();
  }, [dispatch]);

  useEffect(() => {
    if (isHydratingDraftRef.current) {
      return;
    }

    if (!addresses.length) {
      setShowForm(true);
      setSelectedId(null);
      setEditingAddressId(null);
      if (!draftHydratedRef.current) {
        setFormState(buildInitialFormState());
      }
    } else if (!selectedId) {
      const defaultAddress = addresses.find((address) => address.isDefault);
      setSelectedId(defaultAddress?._id || addresses[0]._id);
      setShowForm(false);
      draftHydratedRef.current = false;
    }
  }, [addresses, selectedId, user?.email]);

  useEffect(() => {
    const trimmedPincode = String(formState.pincode || "").trim();

    if (!trimmedPincode || !/^\d{6}$/.test(trimmedPincode)) {
      lastResolvedPincodeRef.current = "";
      return;
    }

    if (trimmedPincode === lastResolvedPincodeRef.current) {
      return;
    }

    let isActive = true;

    const resolveLocation = async () => {
      const lookup = await fetchLocationByPincode(trimmedPincode);

      if (!isActive) {
        return;
      }

      if (!lookup.success) {
        lastResolvedPincodeRef.current = "";
        toast.error(
          lookup.message || "Could not validate this PIN code with India Post.",
          { duration: TOAST_DURATION }
        );
        return;
      }

      lastResolvedPincodeRef.current = trimmedPincode;

      const resolvedStateName = resolveStateName(lookup.data?.state || "");
      const resolvedCityName = lookup.data?.city || "";

      setFormState((prev) => {
        if (prev.pincode !== trimmedPincode) {
          return prev;
        }

        const nextState = resolvedStateName || prev.state;
        const nextCity = resolvedCityName || prev.city;

        if (nextState === prev.state && nextCity === prev.city) {
          return prev;
        }

        return {
          ...prev,
          state: nextState,
          city: nextCity,
        };
      });
    };

    resolveLocation();

    return () => {
      isActive = false;
    };
  }, [formState.pincode, resolveStateName]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedId) || null,
    [addresses, selectedId]
  );

  const fieldClasses =
    "w-full rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-3 text-sm sm:text-[15px] text-secondary placeholder:text-slate-400 focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 transition disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:opacity-60";
  const textareaClasses = `${fieldClasses} min-h-[132px] resize-none leading-6`;
  const subtleButtonClasses =
    "w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full border border-slate-200 px-5 text-sm font-semibold text-secondary transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary";
  const primaryButtonClasses =
    "w-full sm:w-auto inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60";
  const addressCardBaseClasses =
    "group block rounded-2xl border border-slate-200 bg-white/80 p-4 sm:p-5 shadow-sm transition hover:border-primary/50 hover:shadow-md";
  const formSectionClasses =
    "rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-sm shadow-slate-200/40 sm:p-5 space-y-4";
  const twoColumnGridClasses = "grid gap-4 min-[480px]:grid-cols-2 sm:gap-5";
  const labelClasses =
    "flex flex-col gap-1.5 text-sm font-medium text-secondary/80";

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const resolvedValue = type === "checkbox" ? checked : value;

    setFormState((prev) => ({
      ...prev,
      [name]: resolvedValue,
      ...(name === "state" && prev.state !== resolvedValue ? { city: "" } : {}),
      ...(name === "addressLine" ||
      name === "city" ||
      name === "state" ||
      name === "pincode"
        ? {
            isGeoVerified: false,
            latitude: null,
            longitude: null,
            formattedAddress: "",
          }
        : {}),
    }));
  };

  const handleSaveAddress = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    let payload = {
      ...formState,
      isDefault:
        editingAddressId !== null
          ? formState.isDefault
          : formState.isDefault || addresses.length === 0,
    };

    try {
      const validation = validateAddressForm(formState);
      if (!validation.isValid) {
        validation.errors.forEach((message) =>
          toast.error(message, { duration: TOAST_DURATION })
        );
        setSubmitting(false);
        return;
      }

      if (payload.addressLine.length > MAX_ADDRESS_LINE_LENGTH) {
        payload.addressLine = payload.addressLine.slice(
          0,
          MAX_ADDRESS_LINE_LENGTH
        );
      }

      const geoCoordinates = await fetchGeoCoordinates({
        city: payload.city,
        state: payload.state,
        pincode: payload.pincode,
      });

      if (geoCoordinates) {
        payload.latitude = geoCoordinates.latitude;
        payload.longitude = geoCoordinates.longitude;
        payload.formattedAddress = geoCoordinates.formattedAddress
          .slice(0, MAX_FORMATTED_ADDRESS_LENGTH)
          .trim();
        if (!payload.formattedAddress) {
          delete payload.formattedAddress;
        }
        payload.isGeoVerified = true;
      }

      let response;
      const sanitizedPayload = { ...payload };
      sanitizedPayload.email =
        sanitizedPayload.email?.trim() || user?.email?.trim() || "";

      if (!sanitizedPayload.email) {
        toast.error("Email is required for delivery updates.", {
          duration: TOAST_DURATION,
        });
        setSubmitting(false);
        return;
      }

      ["latitude", "longitude"].forEach((field) => {
        if (
          sanitizedPayload[field] === null ||
          sanitizedPayload[field] === undefined
        ) {
          delete sanitizedPayload[field];
        }
      });
      if (!sanitizedPayload.formattedAddress?.trim()) {
        delete sanitizedPayload.formattedAddress;
      }
      if (
        sanitizedPayload.formattedAddress?.length > MAX_FORMATTED_ADDRESS_LENGTH
      ) {
        sanitizedPayload.formattedAddress = sanitizedPayload.formattedAddress
          .slice(0, MAX_FORMATTED_ADDRESS_LENGTH)
          .trim();
      }
      if (!sanitizedPayload.alternatePhone?.trim()) {
        delete sanitizedPayload.alternatePhone;
      }

      if (editingAddressId) {
        response = await updateAddress(editingAddressId, sanitizedPayload);
        toast.success("Address updated successfully", {
          duration: TOAST_DURATION,
        });
      } else {
        response = await addAddress(sanitizedPayload);
        toast.success("Address saved successfully", {
          duration: TOAST_DURATION,
        });
      }

      const data = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];
      dispatch(setAddresses(data));

      if (!editingAddressId && data.length) {
        const newest = data[data.length - 1];
        setSelectedId(newest?._id || null);
      }

      if (editingAddressId) {
        setSelectedId(editingAddressId);
      }

      setShowForm(false);
      setFormState(buildInitialFormState());
      clearDraft();
      setEditingAddressId(null);
    } catch (error) {
      console.error("Failed to save address", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to save address",
        { duration: TOAST_DURATION }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddressId(address._id);
    setFormState({
      fullName: address.fullName || "",
      mobile: address.mobile || "",
      email: address.email || "",
      pincode: address.pincode || "",
      state: address.state || "",
      city: address.city || "",
      addressLine: address.addressLine || "",
      alternatePhone: address.alternatePhone || "",
      isDefault: Boolean(address.isDefault),
      latitude: address.latitude ?? null,
      longitude: address.longitude ?? null,
      formattedAddress: address.formattedAddress || "",
      isGeoVerified: Boolean(address.isGeoVerified),
    });
    setShowForm(true);
  };

  const handleDeleteAddress = async (address) => {
    const confirmed = window.confirm(
      `Delete address for ${address.fullName}? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const targetId = address._id || address.id;
      if (!targetId) {
        toast.error("Unable to delete address: missing identifier", {
          duration: TOAST_DURATION,
        });
        return;
      }

      const response = await deleteAddress(targetId);
      const data = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];
      dispatch(setAddresses(data));
      toast.success("Address removed", { duration: TOAST_DURATION });

      if (editingAddressId === address._id) {
        setEditingAddressId(null);
        setFormState(buildInitialFormState());
        setShowForm(false);
      }

      if (!data.length) {
        setSelectedId(null);
        setShowForm(true);
      } else if (selectedId === address._id || selectedId === address.id) {
        const defaultAddress = data.find((item) => item.isDefault);
        setSelectedId(defaultAddress?._id || data[0]._id);
      }
    } catch (error) {
      console.error("Failed to delete address", error);
      toast.error(
        error.response?.data?.message ||
          error.message ||
          "Failed to delete address",
        { duration: TOAST_DURATION }
      );
    }
  };

  const handleContinue = () => {
    if (showForm && !addresses.length) {
      toast.error("Please add an address before continuing", {
        duration: TOAST_DURATION,
      });
      return;
    }

    if (!selectedAddress) {
      toast.error("Select an address to proceed", {
        duration: TOAST_DURATION,
      });
      return;
    }

    dispatch(setShippingAddress(selectedAddress));
    dispatch(setCheckoutStep("payment"));
    navigate("/checkout/payment");
  };

  const toggleFormLabel = showForm
    ? editingAddressId
      ? "Cancel editing"
      : "Close form"
    : "+ Add New Address";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white/80 px-5 py-5 shadow-sm backdrop-blur sm:p-6">
              <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-secondary">
                    Delivery Address
                  </h2>
                  <p className="text-sm text-medium-text">
                    Choose an existing address or add a new one.
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
                  Step 2 of 4
                </span>
              </header>
            </section>

            {loading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center text-medium-text shadow-sm">
                Loading your saved addresses...
              </div>
            ) : (
              <section className={formSectionClasses}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-secondary">
                      Saved Addresses
                    </h3>
                    <p className="text-xs text-medium-text">
                      Tap an address to use it for this order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (showForm) {
                        handleCancelForm();
                      } else {
                        setEditingAddressId(null);
                        setFormState(buildInitialFormState());
                        setShowForm(true);
                        clearDraft();
                      }
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-2 text-sm font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10 sm:w-auto"
                  >
                    {toggleFormLabel}
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {!addresses.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-medium-text">
                      You have not added any delivery addresses yet.
                    </div>
                  ) : (
                    addresses.map((address, index) => {
                      const addressKey = address._id || address.id || index;
                      const isSelected =
                        selectedId === address._id || selectedId === address.id;

                      return (
                        <label
                          key={addressKey}
                          className={`${addressCardBaseClasses} ${
                            isSelected
                              ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                              : ""
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="selectedAddress"
                                checked={isSelected}
                                onChange={() =>
                                  setSelectedId(address._id || address.id)
                                }
                                className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                              />
                              <div className="space-y-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                  <h3 className="text-base font-semibold text-secondary">
                                    {address.fullName}
                                  </h3>
                                  {address.isDefault && (
                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                                      Default
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm leading-6 text-medium-text">
                                  {address.addressLine}, {address.city},{" "}
                                  {address.state} - {address.pincode}
                                </p>
                                <div className="flex flex-wrap gap-3 text-xs text-medium-text">
                                  <span className="font-semibold text-secondary">
                                    Mobile:
                                  </span>
                                  <span>{address.mobile}</span>
                                  {address.alternatePhone ? (
                                    <span>
                                      <span className="font-semibold text-secondary">
                                        Alternate:
                                      </span>{" "}
                                      {address.alternatePhone}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-slate-400">
                                  Email: {address.email}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2 sm:pr-1">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleEditAddress(address);
                                }}
                                className="inline-flex items-center rounded-full border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary transition hover:border-primary/60 hover:bg-primary/10"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  handleDeleteAddress(address);
                                }}
                                className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 transition hover:border-rose-300 hover:bg-rose-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </section>
            )}

            {showForm && (
              <motion.form
                onSubmit={handleSaveAddress}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${formSectionClasses} shadow-lg`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-secondary">
                    {editingAddressId ? "Update Address" : "Add New Address"}
                  </h3>
                  {editingAddressId ? (
                    <span className="text-xs text-medium-text">
                      Editing existing address
                    </span>
                  ) : null}
                </div>

                <div className={`mt-5 ${twoColumnGridClasses}`}>
                  <label className={labelClasses}>
                    Full Name
                    <input
                      type="text"
                      name="fullName"
                      value={formState.fullName}
                      onChange={handleFormChange}
                      required
                      className={fieldClasses}
                    />
                  </label>
                  <label className={labelClasses}>
                    Mobile Number
                    <input
                      type="tel"
                      name="mobile"
                      value={formState.mobile}
                      onChange={handleFormChange}
                      required
                      className={fieldClasses}
                    />
                  </label>
                  <label className={labelClasses}>
                    Email
                    <input
                      type="email"
                      name="email"
                      value={formState.email}
                      onChange={handleFormChange}
                      required
                      className={fieldClasses}
                    />
                  </label>
                  <label className={labelClasses}>
                    Pincode
                    <input
                      type="text"
                      name="pincode"
                      value={formState.pincode}
                      onChange={handleFormChange}
                      required
                      className={fieldClasses}
                    />
                  </label>
                  <label className={labelClasses}>
                    State
                    <select
                      name="state"
                      value={formState.state}
                      onChange={handleFormChange}
                      required
                      className={`${fieldClasses} appearance-none`}
                    >
                      <option value="">Select state</option>
                      {STATE_OPTIONS.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={labelClasses}>
                    City
                    <select
                      name="city"
                      value={formState.city}
                      onChange={handleFormChange}
                      required
                      disabled={!formState.state && !cityOptions.length}
                      className={`${fieldClasses} appearance-none`}
                    >
                      <option value="">
                        {formState.state || cityOptions.length
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
                </div>

                <label className={`${labelClasses} mt-4`}>
                  Address Line
                  <textarea
                    name="addressLine"
                    value={formState.addressLine}
                    onChange={handleFormChange}
                    required
                    className={textareaClasses}
                  />
                </label>

                {formState.isGeoVerified ? (
                  <p className="mt-2 text-xs text-emerald-600">
                    Address verified via map service.
                  </p>
                ) : null}

                <p className="mt-2 text-xs text-medium-text">
                  Enter the full delivery address as it should appear on the
                  package. Our team will review it before shipping.
                </p>

                <div className={`mt-4 ${twoColumnGridClasses}`}>
                  <label className={labelClasses}>
                    Alternate Phone (optional)
                    <input
                      type="tel"
                      name="alternatePhone"
                      value={formState.alternatePhone}
                      onChange={handleFormChange}
                      className={fieldClasses}
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-secondary">
                    <input
                      type="checkbox"
                      name="isDefault"
                      checked={formState.isDefault}
                      onChange={handleFormChange}
                      className="h-4 w-4 text-primary focus:ring-primary"
                    />
                    Set as default delivery address
                  </label>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className={subtleButtonClasses}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className={subtleButtonClasses}
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={submitting}
                    className={primaryButtonClasses}
                  >
                    {submitting
                      ? editingAddressId
                        ? "Updating..."
                        : "Saving..."
                      : editingAddressId
                      ? "Save Changes"
                      : "Save Address"}
                    {submitting && (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    )}
                  </motion.button>
                </div>
              </motion.form>
            )}

            <section className={formSectionClasses}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-medium-text">
                  {selectedAddress
                    ? `Delivering to ${selectedAddress.fullName}`
                    : "Select or add an address to proceed."}
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleContinue}
                  className={primaryButtonClasses}
                >
                  Continue to Payment
                </motion.button>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-8">
              <h3 className="text-lg font-semibold text-secondary">
                Why we need this?
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-medium-text">
                <li>• Ensure accurate delivery of your order.</li>
                <li>• Provide updates on shipping and delivery status.</li>
                <li>• Offer faster checkout for future purchases.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
export default CheckoutAddress;
