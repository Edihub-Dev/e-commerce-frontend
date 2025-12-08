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
    dispatch(setCheckoutStep("address"));
    if (!items.length) {
      toast.error("Your checkout session expired. Start again.");
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
        toast.error(error.message || "Failed to fetch addresses");
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
    lastResolvedPincodeRef.current = String(formState.pincode || "").trim();
  }, [formState.pincode]);

  const selectedAddress = useMemo(
    () => addresses.find((address) => address._id === selectedId) || null,
    [addresses, selectedId]
  );

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
        validation.errors.forEach((message) => toast.error(message));
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
        toast.error("Email is required for delivery updates.");
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
        toast.success("Address updated successfully");
      } else {
        response = await addAddress(sanitizedPayload);
        toast.success("Address saved successfully");
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
          "Failed to save address"
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
        toast.error("Unable to delete address: missing identifier");
        return;
      }

      const response = await deleteAddress(targetId);
      const data = Array.isArray(response)
        ? response
        : response?.data?.data || response?.data || [];
      dispatch(setAddresses(data));
      toast.success("Address removed");

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
          "Failed to delete address"
      );
    }
  };

  const handleContinue = () => {
    if (showForm && !addresses.length) {
      toast.error("Please add an address before continuing");
      return;
    }

    if (!selectedAddress) {
      toast.error("Select an address to proceed");
      return;
    }

    dispatch(setShippingAddress(selectedAddress));
    dispatch(setCheckoutStep("payment"));
    navigate("/checkout/payment");
  };

  return (
    <div className="grid lg:grid-cols-[2fr,1fr] gap-0">
      <div className="p-6 lg:p-10 space-y-8">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-secondary">
              Delivery Address
            </h2>
            <p className="text-sm text-medium-text mt-1">
              Choose an existing address or add a new one.
            </p>
          </div>
          <span className="text-sm text-primary bg-primary/10 px-3 py-1 rounded-full">
            Step 2 of 4
          </span>
        </header>

        {loading ? (
          <div className="border border-slate-200 rounded-2xl p-6 text-center text-medium-text">
            Loading your saved addresses...
          </div>
        ) : (
          <div className="space-y-4">
            {addresses.map((address, index) => {
              const addressKey = address._id || address.id || index;
              const isSelected =
                selectedId === address._id || selectedId === address.id;

              return (
                <label
                  key={addressKey}
                  className={`block border rounded-2xl p-4 cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-slate-200 bg-white hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="radio"
                      name="selectedAddress"
                      checked={isSelected}
                      onChange={() => setSelectedId(address._id || address.id)}
                      className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-3 justify-between">
                        <div className="flex items-center gap-3">
                          <h3 className="text-base font-semibold text-secondary">
                            {address.fullName}
                          </h3>
                          {address.isDefault && (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                              Default
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              handleEditAddress(address);
                            }}
                            className="text-xs font-medium text-primary hover:text-primary-dark"
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
                            className="text-xs font-medium text-rose-500 hover:text-rose-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-medium-text">
                        {address.addressLine}, {address.city}, {address.state} -{" "}
                        {address.pincode}
                      </p>
                      <p className="text-sm text-medium-text">
                        Mobile: {address.mobile}
                      </p>
                      {address.alternatePhone && (
                        <p className="text-sm text-medium-text">
                          Alternate: {address.alternatePhone}
                        </p>
                      )}
                      <p className="text-xs text-slate-400">
                        Email: {address.email}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}

            <button
              type="button"
              onClick={() => {
                setShowForm((prev) => !prev);
                setEditingAddressId(null);
                setFormState(buildInitialFormState());
                clearDraft();
              }}
              className="text-sm font-medium text-primary hover:text-primary-dark"
            >
              {showForm && !editingAddressId
                ? "Cancel adding new address"
                : showForm && editingAddressId
                ? "Cancel editing"
                : "+ Add New Address"}
            </button>
          </div>
        )}

        {showForm && (
          <motion.form
            onSubmit={handleSaveAddress}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-slate-200 rounded-2xl p-6 space-y-4 bg-white"
          >
            <h3 className="text-lg font-semibold text-secondary">
              {editingAddressId ? "Update Address" : "Add New Address"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                Full Name
                <input
                  type="text"
                  name="fullName"
                  value={formState.fullName}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                Mobile Number
                <input
                  type="tel"
                  name="mobile"
                  value={formState.mobile}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                Email
                <input
                  type="email"
                  name="email"
                  value={formState.email}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                Pincode
                <input
                  type="text"
                  name="pincode"
                  value={formState.pincode}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                State
                <select
                  name="state"
                  value={formState.state}
                  onChange={handleFormChange}
                  required
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-secondary/80">
                City
                <select
                  name="city"
                  value={formState.city}
                  onChange={handleFormChange}
                  required
                  disabled={!formState.state && !cityOptions.length}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:bg-slate-100"
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
            <label className="space-y-2 text-sm font-medium text-secondary/80 block">
              Address Line
              <textarea
                name="addressLine"
                value={formState.addressLine}
                onChange={handleFormChange}
                required
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            {formState.isGeoVerified ? (
              <p className="text-xs text-emerald-600">
                Address verified via map service.
              </p>
            ) : null}
            <p className="text-xs text-medium-text">
              Enter the full delivery address as it should appear on the
              package. Our team will review it before shipping.
            </p>
            <label className="space-y-2 text-sm font-medium text-secondary/80 block">
              Alternate Phone (optional)
              <input
                type="tel"
                name="alternatePhone"
                value={formState.alternatePhone}
                onChange={handleFormChange}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-medium-text">
              <input
                type="checkbox"
                name="isDefault"
                checked={formState.isDefault}
                onChange={handleFormChange}
                className="h-4 w-4 text-primary focus:ring-primary"
              />
              Set as default delivery address
            </label>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-secondary hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetForm}
                className="px-4 py-2 rounded-lg border border-slate-200 text-secondary hover:bg-slate-50"
              >
                Reset
              </button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium shadow-md shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? editingAddressId
                    ? "Updating..."
                    : "Saving..."
                  : editingAddressId
                  ? "Save Changes"
                  : "Save Address"}
                {submitting && (
                  <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />
                )}
              </motion.button>
            </div>
          </motion.form>
        )}

        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleContinue}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold shadow-md shadow-primary/20 hover:bg-primary-dark transition"
          >
            Continue to Payment
          </motion.button>
        </div>
      </div>

      <aside className="bg-white border-l border-slate-100 p-6 lg:p-8">
        <h3 className="text-lg font-semibold text-secondary">
          Why we need this?
        </h3>
        <ul className="mt-4 space-y-3 text-sm text-medium-text">
          <li>• Ensure accurate delivery of your order.</li>
          <li>• Provide updates on shipping and delivery status.</li>
          <li>• Offer faster checkout for future purchases.</li>
        </ul>
      </aside>
    </div>
  );
};

export default CheckoutAddress;
