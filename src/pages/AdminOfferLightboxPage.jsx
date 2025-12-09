import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Upload,
  Image as ImageIcon,
  Palette,
  Sparkles,
  Send,
  Clock,
  X,
  CheckCircle2,
  Copy,
  ChevronDown,
} from "lucide-react";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAdminOfferLightboxesThunk,
  createAdminOfferLightboxThunk,
  updateAdminOfferLightboxThunk,
  deleteAdminOfferLightboxThunk,
} from "../store/thunks/adminOfferLightboxThunks";
import {
  resetAdminOfferLightboxState,
  selectOfferLightbox,
} from "../store/slices/adminOfferLightboxSlice";
import { toast } from "react-hot-toast";
import { fetchAdminProducts } from "../services/adminProductsApi";
import { fetchAvailableFooterCategories } from "../services/footerCategoryApi";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3MB

const defaultDraft = {
  title: "",
  subtitle: "",
  description: "",
  buttonLabel: "",
  buttonLinkType: "none",
  buttonLinkValue: "",
  secondaryLabel: "",
  secondaryHref: "",
  imageUrl: "",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  accentColor: "#008ecc",
  couponCode: "",
  couponDescription: "",
  stickyTimeoutHours: 24,
  isActive: true,
  showOnOffersPage: true,
};

const sanitizeNumber = (value, fallback = 24) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const CTA_LINK_TYPE_OPTIONS = [
  {
    value: "none",
    label: "No link action",
  },
  {
    value: "product",
    label: "Specific product",
  },
  {
    value: "category",
    label: "Product category",
  },
  {
    value: "custom",
    label: "Custom URL",
  },
];

const DropdownField = ({
  placeholder,
  options,
  value,
  onSelect,
  disabled,
  loading,
  loadingLabel,
  emptyLabel,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const selectedOption = useMemo(() => {
    const match = options.find((option) => option.value === value);
    if (match) {
      return match;
    }
    if (options.length && !value) {
      return null;
    }
    return null;
  }, [options, value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (disabled) {
      setIsOpen(false);
    }
  }, [disabled]);

  const toggleOpen = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
  }, [disabled]);

  const handleSelect = useCallback(
    (optionValue) => {
      onSelect(optionValue);
      setIsOpen(false);
    },
    [onSelect]
  );

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        }`}
      >
        <span className="flex min-h-[36px] flex-col justify-center">
          <span
            className={`font-medium ${
              selectedOption ? "text-slate-900" : "text-slate-400"
            }`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.meta ? (
            <span className="text-xs text-slate-500">
              {selectedOption.meta}
            </span>
          ) : null}
        </span>
        <ChevronDown
          size={16}
          className={`ml-2 shrink-0 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {loading ? (
              <li className="px-3 py-2 text-sm text-slate-500">
                {loadingLabel}
              </li>
            ) : options.length ? (
              <div className="max-h-60 overflow-y-auto py-1">
                {options.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <li key={option.value}>
                      <button
                        type="button"
                        onClick={() => handleSelect(option.value)}
                        className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition ${
                          isSelected
                            ? "bg-blue-50 text-blue-700"
                            : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                        }`}
                      >
                        <span className="font-medium">{option.label}</span>
                        {option.meta ? (
                          <span className="text-xs text-slate-500">
                            {option.meta}
                          </span>
                        ) : null}
                      </button>
                    </li>
                  );
                })}
              </div>
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">{emptyLabel}</li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
      {error ? <p className="mt-1 text-xs text-rose-500">{error}</p> : null}
    </div>
  );
};

const buildPayload = (draft, shouldClearImage) => {
  const payload = {
    title: draft.title,
    subtitle: draft.subtitle,
    description: draft.description,
    buttonLabel: draft.buttonLabel,
    buttonLinkType: draft.buttonLinkType,
    buttonLinkValue:
      draft.buttonLinkType && draft.buttonLinkType !== "none"
        ? draft.buttonLinkValue
        : "",
    secondaryLabel: draft.secondaryLabel,
    secondaryHref: draft.secondaryHref,
    backgroundColor: draft.backgroundColor,
    textColor: draft.textColor,
    accentColor: draft.accentColor,
    couponCode: draft.couponCode,
    couponDescription: draft.couponDescription,
    stickyTimeoutHours: sanitizeNumber(draft.stickyTimeoutHours),
    isActive: Boolean(draft.isActive),
    showOnOffersPage: Boolean(draft.showOnOffersPage),
  };

  if (draft.imageUrl && !shouldClearImage) {
    payload.imageUrl = draft.imageUrl;
  }

  if (shouldClearImage) {
    payload.clearImage = true;
  }

  return payload;
};

const AdminOfferLightboxPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const {
    list,
    status,
    error,
    saving,
    validationErrors,
    lastSavedAt,
    selectedId,
  } = useAppSelector((state) => state.adminOfferLightbox);

  const [draft, setDraft] = useState(defaultDraft);
  const [shouldClearImage, setShouldClearImage] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [optionsLoading, setOptionsLoading] = useState({
    products: false,
    categories: false,
  });
  const [optionsError, setOptionsError] = useState({
    products: null,
    categories: null,
  });
  const isMountedRef = useRef(true);
  const productSelectionRef = useRef("");
  const categorySelectionRef = useRef("");
  const currentLinkType = draft.buttonLinkType;
  const currentLinkValue = draft.buttonLinkValue;

  const selectedOffer = useMemo(() => {
    if (!selectedId) {
      return null;
    }
    return list.find((offer) => offer?._id === selectedId) || null;
  }, [list, selectedId]);

  const savedState = useMemo(() => {
    if (!selectedOffer) {
      return { ...defaultDraft };
    }

    return {
      ...defaultDraft,
      ...selectedOffer,
      stickyTimeoutHours:
        selectedOffer.stickyTimeoutHours ?? defaultDraft.stickyTimeoutHours,
      imageUrl: selectedOffer.imageUrl || "",
      buttonLinkType:
        selectedOffer.buttonLinkType || defaultDraft.buttonLinkType,
      buttonLinkValue: selectedOffer.buttonLinkValue || "",
      couponCode: selectedOffer.couponCode || "",
      couponDescription: selectedOffer.couponDescription || "",
      isActive:
        typeof selectedOffer.isActive === "boolean"
          ? selectedOffer.isActive
          : defaultDraft.isActive,
      showOnOffersPage:
        typeof selectedOffer.showOnOffersPage === "boolean"
          ? selectedOffer.showOnOffersPage
          : defaultDraft.showOnOffersPage,
    };
  }, [selectedOffer]);

  const normalizedDraft = useMemo(
    () => ({
      ...draft,
      stickyTimeoutHours: sanitizeNumber(draft.stickyTimeoutHours),
      imageUrl: shouldClearImage ? "" : draft.imageUrl || "",
      buttonLinkType: draft.buttonLinkType || "none",
      buttonLinkValue:
        draft.buttonLinkType && draft.buttonLinkType !== "none"
          ? draft.buttonLinkValue || ""
          : "",
      couponCode: draft.couponCode || "",
      couponDescription: draft.couponDescription || "",
      isActive: Boolean(draft.isActive),
      showOnOffersPage: Boolean(draft.showOnOffersPage),
    }),
    [draft, shouldClearImage]
  );

  const normalizedSaved = useMemo(
    () => ({
      ...savedState,
      stickyTimeoutHours: sanitizeNumber(savedState.stickyTimeoutHours),
      imageUrl: savedState.imageUrl || "",
      buttonLinkType: savedState.buttonLinkType || defaultDraft.buttonLinkType,
      buttonLinkValue:
        savedState.buttonLinkType && savedState.buttonLinkType !== "none"
          ? savedState.buttonLinkValue || ""
          : "",
      couponCode: savedState.couponCode || "",
      couponDescription: savedState.couponDescription || "",
      isActive: Boolean(savedState.isActive),
      showOnOffersPage: Boolean(savedState.showOnOffersPage),
    }),
    [savedState]
  );

  const isExistingOffer = Boolean(selectedOffer?._id);
  const hasOffers = list.length > 0;

  const handleSelectOffer = useCallback(
    (offerId) => {
      dispatch(selectOfferLightbox(offerId));
      setDraft(defaultDraft);
      setShouldClearImage(false);
      setIsCreating(false);
    },
    [dispatch]
  );

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    dispatch(selectOfferLightbox(null));
    setDraft({ ...defaultDraft, isActive: false });
    setShouldClearImage(false);
  }, [dispatch]);

  const isDirty = useMemo(() => {
    return (
      JSON.stringify({ ...normalizedDraft, __clear: shouldClearImage }) !==
      JSON.stringify({ ...normalizedSaved, __clear: false })
    );
  }, [normalizedDraft, normalizedSaved, shouldClearImage]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAdminOfferLightboxesThunk());
    }
  }, [status, dispatch]);

  useEffect(() => {
    const loadProducts = async () => {
      setOptionsLoading((prev) => ({ ...prev, products: true }));
      setOptionsError((prev) => ({ ...prev, products: null }));
      try {
        const response = await fetchAdminProducts({
          limit: 200,
          sortBy: "name",
          sortOrder: "asc",
          status: "published",
        });
        if (!isMountedRef.current) return;
        const items = Array.isArray(response?.data) ? response.data : [];
        const mapped = items.map((product, index) => {
          const value = product?.slug || product?._id || "";
          const label = product?.name?.trim() || `Product ${index + 1}`;
          const metaParts = [];
          if (product?.sku) {
            metaParts.push(`SKU ${product.sku}`);
          }
          if (product?.slug) {
            metaParts.push(`Slug ${product.slug}`);
          }
          return {
            value,
            label,
            meta: metaParts.join(" • ") || null,
            id: product?._id,
            slug: product?.slug,
          };
        });
        setProductOptions(mapped);
      } catch (productError) {
        if (!isMountedRef.current) return;
        const message = productError?.message || "Failed to load products";
        setOptionsError((prev) => ({ ...prev, products: message }));
        setProductOptions([]);
      } finally {
        if (isMountedRef.current) {
          setOptionsLoading((prev) => ({ ...prev, products: false }));
        }
      }
    };

    const loadCategories = async () => {
      setOptionsLoading((prev) => ({ ...prev, categories: true }));
      setOptionsError((prev) => ({ ...prev, categories: null }));
      try {
        const response = await fetchAvailableFooterCategories();
        if (!isMountedRef.current) return;
        const categories = Array.isArray(response?.data) ? response.data : [];
        const mapped = categories.map((category, index) => ({
          value: category?.slug || "",
          label: category?.name?.trim() || `Category ${index + 1}`,
          meta: category?.slug ? `Slug ${category.slug}` : null,
          slug: category?.slug || "",
        }));
        setCategoryOptions(mapped);
      } catch (categoryError) {
        if (!isMountedRef.current) return;
        const message =
          categoryError?.message || "Failed to load product categories";
        setOptionsError((prev) => ({ ...prev, categories: message }));
        setCategoryOptions([]);
      } finally {
        if (isMountedRef.current) {
          setOptionsLoading((prev) => ({ ...prev, categories: false }));
        }
      }
    };

    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (status === "succeeded" && selectedOffer && !isCreating) {
      setDraft(savedState);
      setShouldClearImage(false);
    }
  }, [status, savedState, selectedOffer, isCreating]);

  useEffect(() => {
    if (currentLinkType === "product" && currentLinkValue) {
      productSelectionRef.current = currentLinkValue;
    } else if (currentLinkType === "category" && currentLinkValue) {
      categorySelectionRef.current = currentLinkValue;
    }
  }, [currentLinkType, currentLinkValue]);

  useEffect(() => {
    if (error && status === "failed") {
      toast.error(error);
    }
  }, [error, status]);

  useEffect(() => {
    if (lastSavedAt) {
      toast.success("Offer lightbox saved");
    }
  }, [lastSavedAt]);

  useEffect(() => {
    return () => {
      dispatch(resetAdminOfferLightboxState());
    };
  }, [dispatch]);

  const handleFieldChange = useCallback(
    (field) => (event) => {
      const { value } = event.target;
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleCheckboxChange = useCallback(
    (field) => (event) => {
      const { checked } = event.target;
      setDraft((prev) => ({ ...prev, [field]: checked }));
    },
    []
  );

  const handleLinkTypeChange = useCallback(
    (nextType) => {
      setDraft((prev) => {
        if (prev.buttonLinkType === nextType) {
          return prev;
        }

        let nextValue = prev.buttonLinkValue;

        if (nextType === "product") {
          let preferred = productSelectionRef.current;
          if (!productOptions.some((option) => option.value === preferred)) {
            preferred = productOptions[0]?.value || "";
          }
          productSelectionRef.current = preferred;
          nextValue = preferred;
        } else if (nextType === "category") {
          let preferred = categorySelectionRef.current;
          if (!categoryOptions.some((option) => option.value === preferred)) {
            preferred = categoryOptions[0]?.value || "";
          }
          categorySelectionRef.current = preferred;
          nextValue = preferred;
        } else if (nextType === "custom") {
          nextValue =
            prev.buttonLinkType === "custom" ? prev.buttonLinkValue : "";
        } else {
          nextValue = "";
        }

        return {
          ...prev,
          buttonLinkType: nextType,
          buttonLinkValue: nextValue,
        };
      });
    },
    [productOptions, categoryOptions]
  );

  const handleProductOptionChange = useCallback((value) => {
    productSelectionRef.current = value;
    setDraft((prev) => ({ ...prev, buttonLinkValue: value }));
  }, []);

  const handleCategoryOptionChange = useCallback((value) => {
    categorySelectionRef.current = value;
    setDraft((prev) => ({ ...prev, buttonLinkValue: value }));
  }, []);

  const handleImageUpload = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file");
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image must be smaller than 3MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result || "";
      setDraft((prev) => ({ ...prev, imageUrl: result }));
      setShouldClearImage(false);
      toast.success("Image ready to upload");
    };
    reader.onerror = () => {
      toast.error("Failed to process image");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleClearImage = useCallback(() => {
    setDraft((prev) => ({ ...prev, imageUrl: "" }));
    setShouldClearImage(true);
  }, []);

  const handleReset = useCallback(() => {
    setDraft(savedState);
    setShouldClearImage(false);
  }, [savedState]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      if (!isDirty && !shouldClearImage) {
        toast("No changes to save", { icon: "ℹ️" });
        return;
      }

      const payload = buildPayload(draft, shouldClearImage);
      const shouldCreate = isCreating || !selectedOffer?._id;

      if (shouldCreate) {
        dispatch(createAdminOfferLightboxThunk(payload))
          .unwrap()
          .then(() => {
            setShouldClearImage(false);
            setIsCreating(false);
          })
          .catch((error) => {
            if (typeof error === "string") {
              toast.error(error);
            }
          });
      } else if (selectedOffer?._id) {
        dispatch(
          updateAdminOfferLightboxThunk({
            id: selectedOffer._id,
            data: payload,
          })
        )
          .unwrap()
          .then(() => {
            setShouldClearImage(false);
          })
          .catch((error) => {
            if (typeof error === "string") {
              toast.error(error);
            }
          });
      }
    },
    [dispatch, draft, shouldClearImage, isDirty, isCreating, selectedOffer]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedOffer?._id) {
      return;
    }

    if (!window.confirm("Delete this offer lightbox?")) {
      return;
    }

    try {
      await dispatch(deleteAdminOfferLightboxThunk(selectedOffer._id)).unwrap();
      setDraft(defaultDraft);
      setShouldClearImage(false);
      toast.success("Offer lightbox removed");
    } catch (deleteError) {
      const message =
        deleteError?.message ||
        (typeof deleteError === "string" ? deleteError : null) ||
        "Failed to delete offer lightbox";
      toast.error(message);
    }
  }, [dispatch, selectedOffer]);

  const renderValidationErrors = () => {
    if (!Array.isArray(validationErrors) || !validationErrors.length) {
      return null;
    }

    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        <p className="font-semibold">Please review the following issues:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {validationErrors.map((item, index) => (
            <li key={`${item?.param || "error"}-${index}`}>
              {item?.msg || "Invalid input"}
              {item?.param ? ` (${item.param})` : ""}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const isInitialLoading = status === "loading" && !hasOffers && !isCreating;

  return (
    <div className="min-h-screen md:h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
          active="Offers Lightbox"
          className="hidden md:flex md:w-64 md:flex-none"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex md:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="bg-white w-72 max-w-sm h-full shadow-xl"
              >
                <Sidebar
                  active="Offers Lightbox"
                  className="flex w-full"
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1 bg-black/30"
                aria-label="Close sidebar"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            activeRange="All Date"
            onSelectRange={() => {}}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            notifications={{
              pendingOrders: 0,
              shippedOrders: 0,
              deliveredOrders: 0,
            }}
            showRangeSelector={false}
            showNotifications={false}
          />

          <main className="flex-1 overflow-y-auto bg-slate-50">
            <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8 md:py-10">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue-600">
                    <Sparkles size={14} /> Offers Lightboxes
                  </div>
                  <h1 className="mt-3 text-2xl font-bold text-slate-900 md:text-3xl">
                    Curate multiple promos without redeploys
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500 md:text-base">
                    Manage a collection of marketing lightboxes, toggle them on
                    or off, and fine-tune each offer’s copy, colors, and CTA in
                    one place.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3 self-start lg:self-center">
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-3 py-1.5 text-sm font-semibold text-blue-600 transition hover:border-blue-300 hover:text-blue-700"
                    disabled={saving && isCreating}
                  >
                    <Sparkles size={16} /> Add offer lightbox
                  </button>
                  {saving ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-600">
                      <Loader2 size={16} className="animate-spin" /> Saving…
                    </span>
                  ) : lastSavedAt ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
                      <CheckCircle2 size={16} /> Saved{" "}
                      {new Date(lastSavedAt).toLocaleTimeString()}
                    </span>
                  ) : null}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                      disabled={saving || (!isDirty && !shouldClearImage)}
                    >
                      <X size={16} /> Reset
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                      disabled={saving || !isExistingOffer}
                    >
                      <X size={16} /> Delete
                    </button>
                  </div>
                  <button
                    type="submit"
                    form="offer-lightbox-form"
                    className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                    disabled={saving || (!isDirty && !shouldClearImage)}
                  >
                    <Send size={16} /> Save changes
                  </button>
                </div>
              </div>

              {renderValidationErrors()}

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)]">
                <motion.aside
                  layout
                  className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                      All offers
                    </h2>
                    <span className="text-xs font-medium text-slate-500">
                      {list.length} total
                    </span>
                  </div>

                  {status === "loading" && !list.length ? (
                    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <Loader2 size={16} className="animate-spin" /> Loading
                      offers…
                    </div>
                  ) : null}

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {list.map((offer) => {
                      const isSelected = selectedId === offer._id;
                      return (
                        <button
                          key={offer._id}
                          type="button"
                          onClick={() => handleSelectOffer(offer._id)}
                          className={`w-full rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                            isSelected
                              ? "border-blue-400 bg-blue-50"
                              : "border-slate-200 bg-white hover:border-blue-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {offer.title?.trim() || "Untitled offer"}
                              </p>
                              <p className="text-xs text-slate-500 mt-1">
                                Updated{" "}
                                {new Date(offer.updatedAt).toLocaleString()}
                              </p>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                                offer.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {offer.isActive ? "Active" : "Hidden"}
                            </span>
                          </div>
                          {offer.subtitle ? (
                            <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                              {offer.subtitle}
                            </p>
                          ) : null}
                        </button>
                      );
                    })}

                    {!list.length && !isCreating ? (
                      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                        No offers yet. Click “Add offer lightbox” to create your
                        first promo.
                      </div>
                    ) : null}
                  </div>
                </motion.aside>

                <motion.section
                  layout
                  className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <form
                    id="offer-lightbox-form"
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Headline
                        </span>
                        <input
                          type="text"
                          maxLength={120}
                          value={draft.title}
                          onChange={handleFieldChange("title")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="E.g. Ooh, ₹150 Off"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Subheadline
                        </span>
                        <input
                          type="text"
                          maxLength={200}
                          value={draft.subtitle}
                          onChange={handleFieldChange("subtitle")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Your first order of ₹999 or more"
                        />
                      </label>
                      <label className="md:col-span-2 space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Supporting message
                        </span>
                        <textarea
                          rows={3}
                          maxLength={400}
                          value={draft.description}
                          onChange={handleFieldChange("description")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Share why this offer is irresistible."
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Primary button label
                        </span>
                        <input
                          type="text"
                          maxLength={60}
                          value={draft.buttonLabel}
                          onChange={handleFieldChange("buttonLabel")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="Take ₹150 Off"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Primary button destination
                        </span>
                        <DropdownField
                          placeholder="Pick a destination type"
                          options={CTA_LINK_TYPE_OPTIONS}
                          value={draft.buttonLinkType}
                          onSelect={handleLinkTypeChange}
                          disabled={false}
                          loading={false}
                          loadingLabel=""
                          emptyLabel="No destination types found"
                        />
                        <p className="text-xs text-slate-500">
                          Choose what happens when shoppers click the CTA.
                        </p>
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Destination value
                        </span>
                        {draft.buttonLinkType === "product" ? (
                          <div className="space-y-1">
                            <DropdownField
                              placeholder="Select a product"
                              options={productOptions}
                              value={draft.buttonLinkValue || ""}
                              onSelect={handleProductOptionChange}
                              disabled={
                                optionsLoading.products ||
                                !productOptions.length
                              }
                              loading={optionsLoading.products}
                              loadingLabel="Loading products..."
                              emptyLabel="No published products found"
                              error={optionsError.products}
                            />
                            <p className="text-xs text-slate-500">
                              {draft.buttonLinkValue
                                ? `Button will link to /product/${draft.buttonLinkValue}`
                                : "Create and publish a product to enable this option."}
                            </p>
                          </div>
                        ) : draft.buttonLinkType === "category" ? (
                          <div className="space-y-1">
                            <DropdownField
                              placeholder="Select a category"
                              options={categoryOptions}
                              value={draft.buttonLinkValue || ""}
                              onSelect={handleCategoryOptionChange}
                              disabled={
                                optionsLoading.categories ||
                                !categoryOptions.length
                              }
                              loading={optionsLoading.categories}
                              loadingLabel="Loading categories..."
                              emptyLabel="No categories available"
                              error={optionsError.categories}
                            />
                            <p className="text-xs text-slate-500">
                              {draft.buttonLinkValue
                                ? `Button will link to /category/${draft.buttonLinkValue}`
                                : "Manage footer categories to populate this list."}
                            </p>
                          </div>
                        ) : draft.buttonLinkType === "custom" ? (
                          <>
                            <input
                              type="text"
                              maxLength={200}
                              value={draft.buttonLinkValue}
                              onChange={handleFieldChange("buttonLinkValue")}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                              placeholder="https://example.com/path"
                            />
                            <p className="text-xs text-slate-500">
                              Must start with http:// or https://. Opens in the
                              same tab.
                            </p>
                          </>
                        ) : (
                          <>
                            <input
                              type="text"
                              maxLength={200}
                              value=""
                              disabled
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                              placeholder="No action configured"
                            />
                            <p className="text-xs text-slate-500">
                              Choose a destination type to enable this field.
                            </p>
                          </>
                        )}
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Secondary link label
                        </span>
                        <input
                          type="text"
                          maxLength={120}
                          value={draft.secondaryLabel}
                          onChange={handleFieldChange("secondaryLabel")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="No thanks, I’ll pay full price"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Secondary link URL
                        </span>
                        <input
                          type="text"
                          maxLength={200}
                          value={draft.secondaryHref}
                          onChange={handleFieldChange("secondaryHref")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="https://"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="font-medium text-slate-700">
                          Coupon code
                        </span>
                        <input
                          type="text"
                          maxLength={60}
                          value={draft.couponCode}
                          onChange={handleFieldChange("couponCode")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-[0.15em] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          placeholder="SUMMER25"
                        />
                      </label>
                    </div>

                    <label className="space-y-1 text-sm">
                      <span className="font-medium text-slate-700">
                        Coupon description
                      </span>
                      <textarea
                        rows={2}
                        maxLength={160}
                        value={draft.couponDescription}
                        onChange={handleFieldChange("couponDescription")}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        placeholder="Automatically applied at checkout"
                      />
                    </label>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Palette size={16} /> Background
                        </span>
                        <input
                          type="color"
                          value={draft.backgroundColor || "#ffffff"}
                          onChange={handleFieldChange("backgroundColor")}
                          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Palette size={16} /> Text color
                        </span>
                        <input
                          type="color"
                          value={draft.textColor || "#0f172a"}
                          onChange={handleFieldChange("textColor")}
                          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200"
                        />
                      </label>
                      <label className="space-y-1 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Palette size={16} /> Accent color
                        </span>
                        <input
                          type="color"
                          value={draft.accentColor || "#008ecc"}
                          onChange={handleFieldChange("accentColor")}
                          className="h-12 w-full cursor-pointer rounded-xl border border-slate-200"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="space-y-1 text-sm">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                          <Clock size={16} /> Sticky timeout (hours)
                        </span>
                        <input
                          type="number"
                          min={1}
                          max={168}
                          value={draft.stickyTimeoutHours}
                          onChange={handleFieldChange("stickyTimeoutHours")}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        />
                      </label>
                      <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={handleCheckboxChange("isActive")}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Show this lightbox on the homepage modal
                        </label>
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={draft.showOnOffersPage}
                            onChange={handleCheckboxChange("showOnOffersPage")}
                            className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          Show this lightbox on the Offers page
                        </label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-slate-700">
                            Creative asset
                          </p>
                          <p className="text-sm text-slate-500">
                            Upload a PNG, JPG, or WebP up to 3MB. We recommend a
                            portrait composition.
                          </p>
                        </div>
                        {draft.imageUrl && !shouldClearImage ? (
                          <button
                            type="button"
                            onClick={handleClearImage}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                          >
                            <X size={16} /> Remove
                          </button>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center">
                        <ImageIcon className="h-10 w-10 text-slate-400" />
                        <div className="flex flex-wrap justify-center gap-3">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700">
                            <Upload size={16} /> Upload image
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              setDraft((prev) => ({ ...prev, imageUrl: "" }));
                              setShouldClearImage(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                          >
                            <X size={16} /> Use no image
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          PNG, JPG, or WebP &ndash; up to 3000KB
                        </p>
                      </div>
                      {draft.imageUrl && !shouldClearImage ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                          <img
                            src={draft.imageUrl}
                            alt="Offer visual"
                            className="h-80 w-full object-cover"
                          />
                        </div>
                      ) : null}
                    </div>
                  </form>
                </motion.section>

                <motion.aside
                  layout
                  className="space-y-4 rounded-3xl border border-blue-100 bg-gradient-to-br from-sky-50 to-blue-50/60 p-6 shadow-sm"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-500">
                    Live Preview
                  </p>
                  <div
                    className="relative overflow-hidden rounded-3xl border border-white/60 shadow-lg"
                    style={{
                      backgroundColor:
                        normalizedDraft.backgroundColor || "#ffffff",
                      color: normalizedDraft.textColor || "#0f172a",
                    }}
                  >
                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px]" />
                    <div className="relative grid gap-0 md:grid-cols-[1.2fr_1fr]">
                      <div className="space-y-4 p-6 md:p-8">
                        <span
                          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
                          style={{ color: normalizedDraft.accentColor }}
                        >
                          Limited Time
                        </span>
                        <h2
                          className="text-2xl font-bold md:text-3xl"
                          style={{ color: normalizedDraft.textColor }}
                        >
                          {normalizedDraft.title || "Ooh, ₹150 Off"}
                        </h2>
                        <p
                          className="text-base text-slate-600"
                          style={{ color: normalizedDraft.textColor }}
                        >
                          {normalizedDraft.subtitle ||
                            "Unlock your first order offer when you subscribe."}
                        </p>
                        {normalizedDraft.description ? (
                          <p
                            className="text-sm text-slate-500"
                            style={{ color: normalizedDraft.textColor }}
                          >
                            {normalizedDraft.description}
                          </p>
                        ) : null}
                        <div className="space-y-3">
                          {normalizedDraft.couponCode ? (
                            <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-700 backdrop-blur">
                              <span className="tracking-[0.3em] uppercase">
                                {normalizedDraft.couponCode}
                              </span>
                              <Copy size={16} className="text-slate-500" />
                            </div>
                          ) : null}
                          {normalizedDraft.couponDescription ? (
                            <p className="text-xs text-slate-500">
                              {normalizedDraft.couponDescription}
                            </p>
                          ) : null}
                          <button
                            type="button"
                            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition"
                            style={{
                              backgroundColor:
                                normalizedDraft.accentColor || "#008ecc",
                            }}
                          >
                            {normalizedDraft.buttonLabel || "Take the offer"}
                          </button>
                          <button
                            type="button"
                            className="w-full text-xs font-medium text-slate-500 underline"
                          >
                            {normalizedDraft.secondaryLabel ||
                              "Nvm, I’ll pay full price"}
                          </button>
                        </div>
                      </div>
                      <div className="relative hidden h-full md:block">
                        {normalizedDraft.imageUrl ? (
                          <img
                            src={normalizedDraft.imageUrl}
                            alt="Offer creative"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-4 bg-white/30">
                            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/40">
                              <ImageIcon className="h-16 w-16 text-white/70" />
                            </div>
                            <p className="px-6 text-center text-sm font-medium text-white/80">
                              Drop a visual here to make the lightbox pop.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {!normalizedDraft.isActive ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/85 text-center">
                        <div className="rounded-full border border-orange-300 bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow">
                          Hidden from homepage modal
                        </div>
                      </div>
                    ) : null}
                    {normalizedDraft.isActive &&
                    !normalizedDraft.showOnOffersPage ? (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-slate-300 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-600 shadow">
                        Hidden from Offers listing
                      </div>
                    ) : null}
                  </div>
                  <div className="space-y-2 rounded-2xl bg-white/70 p-4 text-sm text-slate-600">
                    <p>
                      <strong>Sticky behaviour.</strong> Once closed, the
                      lightbox stays hidden for the configured hours using local
                      storage on the storefront.
                    </p>
                    <p>
                      <strong>Image hosting.</strong> Uploads are saved to your
                      S3 bucket and automatically cleaned up when you replace or
                      remove them.
                    </p>
                  </div>
                </motion.aside>
              </div>

              {isInitialLoading ? (
                <div className="mt-10 flex justify-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-500 shadow">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading offer
                    lightbox…
                  </span>
                </div>
              ) : null}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminOfferLightboxPage;
