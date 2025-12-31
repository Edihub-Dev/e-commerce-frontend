import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Tag,
  ShieldCheck,
  Layers,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  ChevronDown,
  Download,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchSellerCouponsThunk,
  createSellerCouponThunk,
  updateSellerCouponThunk,
  deleteSellerCouponThunk,
  deleteSellerCouponsBulkThunk,
  importSellerCouponsThunk,
} from "../store/thunks/sellerCouponsThunks";
import { generateSellerCouponCode } from "../services/sellerCouponsApi";
import {
  setSellerCouponsPage,
  resetSellerCouponsImportState,
} from "../store/slices/sellerCouponsSlice";
import {
  utils as XLSXUtils,
  writeFile as writeXlsxFile,
  read as readXlsx,
} from "xlsx";

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "single", label: "Single use" },
  { value: "multi", label: "Multi use" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "redeemed", label: "Redeemed" },
  { value: "not-redeemed", label: "Not redeemed" },
];

const IMPORT_FIELD_GUIDE = [
  {
    key: "code",
    label: "code",
    helper: "Optional. Leave empty to auto-generate unique code.",
  },
  {
    key: "description",
    label: "description",
    helper: "Short text shown to sellers for context.",
  },
  {
    key: "discountType",
    label: "discountType",
    helper: "Use 'percentage' or 'flat'. Defaults to percentage.",
  },
  {
    key: "discountValue",
    label: "discountValue",
    helper: "Required. Positive number representing % or INR value.",
  },
  {
    key: "maxDiscountAmount",
    label: "maxDiscountAmount",
    helper: "Optional. Cap flat or percentage discount (INR).",
  },
  {
    key: "minOrderAmount",
    label: "minOrderAmount",
    helper: "Optional. Minimum order total to apply coupon (INR).",
  },
  {
    key: "maxRedemptions",
    label: "maxRedemptions",
    helper:
      "Optional. Total times coupon can be redeemed. Leave blank for unlimited (multi-use).",
  },
  {
    key: "maxRedemptionsPerUser",
    label: "maxRedemptionsPerUser",
    helper:
      "Optional. Times a single customer can redeem. Leave blank for unlimited (multi-use).",
  },
  {
    key: "startDate",
    label: "startDate",
    helper: "Optional. Use YYYY-MM-DD or Excel date.",
  },
  {
    key: "endDate",
    label: "endDate",
    helper: "Optional. Use YYYY-MM-DD or Excel date.",
  },
  {
    key: "isActive",
    label: "isActive",
    helper: "Optional. true/false, yes/no, 1/0 to control activation.",
  },
  {
    key: "type",
    label: "type",
    helper:
      "Optional. 'single' for one-time coupons, otherwise treated as multi use.",
  },
];

const IMPORT_LABEL_MAP = IMPORT_FIELD_GUIDE.reduce((accumulator, field) => {
  accumulator[field.key] = field.label;
  return accumulator;
}, {});

const IMPORT_PREVIEW_LIMIT = 5;

const IMPORT_KEY_MAP = {
  code: "code",
  "coupon code": "code",
  couponcode: "code",
  description: "description",
  details: "description",
  "discount type": "discountType",
  discounttype: "discountType",
  "discount category": "discountType",
  "discount value": "discountValue",
  discountvalue: "discountValue",
  "discount amount": "discountValue",
  discount: "discountValue",
  "max discount amount": "maxDiscountAmount",
  "max discount": "maxDiscountAmount",
  maxdiscountamount: "maxDiscountAmount",
  "min order amount": "minOrderAmount",
  "minimum order": "minOrderAmount",
  minorderamount: "minOrderAmount",
  "max redemptions": "maxRedemptions",
  maxredemptions: "maxRedemptions",
  "total redemptions": "maxRedemptions",
  "max redemptions per user": "maxRedemptionsPerUser",
  maxredemptionsperuser: "maxRedemptionsPerUser",
  "per user limit": "maxRedemptionsPerUser",
  "start date": "startDate",
  startdate: "startDate",
  "valid from": "startDate",
  "end date": "endDate",
  enddate: "endDate",
  "valid to": "endDate",
  "is active": "isActive",
  active: "isActive",
  status: "isActive",
  isactive: "isActive",
  type: "type",
  "coupon type": "type",
};

const IMPORT_ALLOWED_KEYS = IMPORT_FIELD_GUIDE.map(({ key }) => key);
const IMPORT_ALLOWED_KEY_SET = new Set(IMPORT_ALLOWED_KEYS);

const normalizeImportHeaderKey = (rawKey) => {
  const trimmed = String(rawKey ?? "").trim();
  if (!trimmed) return null;

  if (IMPORT_ALLOWED_KEY_SET.has(trimmed)) {
    return trimmed;
  }

  const lower = trimmed.toLowerCase();
  if (IMPORT_KEY_MAP[lower]) {
    return IMPORT_KEY_MAP[lower];
  }

  const normalized = lower.replace(/[\s._-]+/g, " ").trim();
  if (IMPORT_KEY_MAP[normalized]) {
    return IMPORT_KEY_MAP[normalized];
  }

  const collapsed = normalized.replace(/\s+/g, "");
  for (const allowed of IMPORT_ALLOWED_KEYS) {
    const allowedLower = allowed.toLowerCase();
    if (
      allowedLower === lower ||
      allowedLower === normalized ||
      allowedLower.replace(/\s+/g, "") === collapsed
    ) {
      return allowed;
    }
  }

  return null;
};

const sanitizeImportValue = (value) => {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }
    return value.toISOString().slice(0, 10);
  }
  return value;
};

const normalizeImportRows = (rows = []) => {
  if (!Array.isArray(rows)) {
    return { rows: [], ignoredHeaders: [] };
  }

  const normalizedRows = [];
  const ignoredHeaderSet = new Set();

  rows.forEach((rawRow) => {
    if (!rawRow || typeof rawRow !== "object") return;

    const normalizedRow = {};
    Object.entries(rawRow).forEach(([rawKey, rawValue]) => {
      const mappedKey = normalizeImportHeaderKey(rawKey);
      if (!mappedKey) {
        if (
          rawValue !== null &&
          rawValue !== undefined &&
          String(rawValue).trim() !== ""
        ) {
          const label = String(rawKey || "").trim();
          if (label) {
            ignoredHeaderSet.add(label);
          }
        }
        return;
      }

      const sanitizedValue = sanitizeImportValue(rawValue);
      if (
        sanitizedValue === "" ||
        sanitizedValue === null ||
        sanitizedValue === undefined
      ) {
        return;
      }

      normalizedRow[mappedKey] = sanitizedValue;
    });

    if (Object.keys(normalizedRow).length > 0) {
      normalizedRows.push(normalizedRow);
    }
  });

  return {
    rows: normalizedRows,
    ignoredHeaders: Array.from(ignoredHeaderSet),
  };
};

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "--";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(numeric);
};

const formatDate = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const remainingLabel = (coupon) => {
  const total = Number(coupon.maxRedemptions || 0);
  const used = Number(coupon.usageCount || 0);
  if (!total) return "Unlimited";
  return `${Math.max(total - used, 0)} of ${total}`;
};

const deriveTypeFromCoupon = (coupon = {}) => {
  const total = Number(coupon.maxRedemptions || 0);
  const perUser = Number(coupon.maxRedemptionsPerUser || 0);
  if (total === 1 && perUser === 1) {
    return "single";
  }
  return "multi";
};

const isCouponRedeemed = (coupon = {}) => {
  const total = Number(coupon.maxRedemptions || 0);
  const used = Number(coupon.usageCount || 0);
  if (!total) return false;
  return used >= total;
};

const parseDiscountBound = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(Math.max(numeric, 0), 100);
};

const formatBoolean = (value) => (value ? "Yes" : "No");

const formatLimit = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Unlimited";
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Unlimited";
  }
  return numeric;
};

const formatFileSize = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    units.length - 1
  );
  const size = value / 1024 ** exponent;

  return `${size % 1 === 0 ? size : size.toFixed(1)} ${units[exponent]}`;
};

const formatDateTime = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const transformSellerCouponsForExport = (couponList) =>
  (Array.isArray(couponList) ? couponList : []).map((coupon, index) => {
    const type = deriveTypeFromCoupon(coupon);
    const isActive = coupon.isActive !== false;
    const isRedeemed = isCouponRedeemed(coupon);
    const totalRedemptions =
      coupon.maxRedemptions !== undefined && coupon.maxRedemptions !== null
        ? coupon.maxRedemptions
        : null;
    const remainingRedemptions =
      totalRedemptions === null
        ? "Unlimited"
        : Math.max(totalRedemptions - (coupon.usageCount || 0), 0);

    return {
      "#": index + 1,
      Code: coupon.code || "",
      Type: type === "single" ? "Single use" : "Multi use",
      "Discount Type": coupon.discountType === "flat" ? "Flat" : "Percentage",
      "Discount Value": Number(coupon.discountValue) || 0,
      "Max Discount Amount": formatCurrency(coupon.maxDiscountAmount),
      "Min Order Amount": formatCurrency(coupon.minOrderAmount),
      "Total Redemptions": formatLimit(totalRedemptions),
      "Per User Limit": formatLimit(coupon.maxRedemptionsPerUser),
      "Usage Count": Number(coupon.usageCount) || 0,
      "Remaining Redemptions": remainingRedemptions,
      Status: !isActive ? "Inactive" : isRedeemed ? "Redeemed" : "Active",
      "Start Date": formatDate(coupon.startDate),
      "End Date": formatDate(coupon.endDate),
      Active: formatBoolean(isActive),
      "Created At": formatDateTime(coupon.createdAt),
      "Updated At": formatDateTime(coupon.updatedAt),
    };
  });

const FilterSelect = ({ value, onValueChange, options, ariaLabel }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0];

  const handleSelect = (nextValue) => {
    onValueChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-100 ${
          isOpen
            ? "border-blue-400 bg-white text-blue-600"
            : "border-slate-200 bg-white text-slate-600 hover:border-blue-300"
        }`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          className={`transition ${
            isOpen ? "rotate-180 text-blue-500" : "text-slate-400"
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+0.35rem)] z-30 w-40 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-48 overflow-y-auto py-1" role="listbox">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <li key={option.value}>
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                    role="option"
                    aria-selected={isActive}
                  >
                    {option.label}
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase text-blue-500">
                        Selected
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

const buildDefaultFormState = () => ({
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  type: "single",
  maxRedemptions: "1",
  maxRedemptionsPerUser: "1",
  startDate: "",
  endDate: "",
  isActive: true,
  count: "1",
});

const toDateInputValue = (value) => {
  if (!value) return "";
  try {
    return value.slice(0, 10);
  } catch (_err) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  }
};

const SellerCoupons = () => {
  const dispatch = useAppDispatch();
  const {
    items: coupons,
    meta,
    status,
    error,
    mutationStatus,
    mutationError,
    importStatus,
    importErrors,
    importSummary,
    importMessage,
  } = useAppSelector((state) => state.sellerCoupons);

  const [formState, setFormState] = useState(buildDefaultFormState());
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterDiscountMin, setFilterDiscountMin] = useState("");
  const [filterDiscountMax, setFilterDiscountMax] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const fileInputRef = useRef(null);
  const [importRows, setImportRows] = useState([]);
  const [importPreviewRows, setImportPreviewRows] = useState([]);
  const [importColumns, setImportColumns] = useState([]);
  const [importSheetName, setImportSheetName] = useState("");
  const [importFileMeta, setImportFileMeta] = useState({
    name: "",
    size: 0,
    lastModified: 0,
    totalRows: 0,
    processedRows: 0,
  });
  const [importParseError, setImportParseError] = useState("");
  const [isParsingImport, setIsParsingImport] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importWarnings, setImportWarnings] = useState([]);

  const isLoadingList = status === "loading";
  const isMutating = mutationStatus === "loading";
  const page = meta.page || 1;
  const limit = meta.limit || 20;
  const totalPages = meta.totalPages || 1;
  const isEditing = Boolean(editingCoupon);
  const countValue = Number(formState.count || "1");
  const isBulkCreate =
    !isEditing && Number.isFinite(countValue) && countValue > 1;
  const isImportProcessing = isParsingImport || importStatus === "loading";
  const readyImportRowCount = importRows.length;
  const importErrorsList = useMemo(
    () => (Array.isArray(importErrors) ? importErrors : []),
    [importErrors]
  );

  const fetchCurrentCoupons = useCallback(() => {
    const isActiveParam =
      statusFilter === "active"
        ? "true"
        : statusFilter === "inactive"
        ? "false"
        : undefined;

    dispatch(
      fetchSellerCouponsThunk({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive: isActiveParam,
      })
    );
  }, [dispatch, page, limit, debouncedSearch, statusFilter]);

  const resetImportState = useCallback(() => {
    setImportRows([]);
    setImportPreviewRows([]);
    setImportColumns([]);
    setImportSheetName("");
    setImportFileMeta({
      name: "",
      size: 0,
      lastModified: 0,
      totalRows: 0,
      processedRows: 0,
    });
    setImportParseError("");
    setImportWarnings([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    dispatch(resetSellerCouponsImportState());
  }, [dispatch]);

  const openImportModal = useCallback(() => {
    resetImportState();
    setIsImportModalOpen(true);
  }, [resetImportState]);

  const closeImportModal = useCallback(() => {
    setIsImportModalOpen(false);
    setImportParseError("");
    resetImportState();
  }, [resetImportState]);

  const summary = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((coupon) => coupon.isActive !== false).length;
    const single = coupons.filter(
      (coupon) => deriveTypeFromCoupon(coupon) === "single"
    ).length;
    const multi = total - single;
    const expiredSingle = coupons.filter(
      (coupon) =>
        deriveTypeFromCoupon(coupon) === "single" && coupon.isActive === false
    ).length;
    const expiredMulti = coupons.filter(
      (coupon) =>
        deriveTypeFromCoupon(coupon) === "multi" && coupon.isActive === false
    ).length;
    const redeemed = coupons.filter((coupon) =>
      isCouponRedeemed(coupon)
    ).length;
    const notRedeemed = total - redeemed;

    return [
      {
        key: "total",
        label: "Total Coupons",
        value: total,
        icon: Tag,
        badgeClass: "bg-blue-50 text-blue-600",
      },
      {
        key: "active",
        label: "Active",
        value: active,
        icon: ShieldCheck,
        badgeClass: "bg-emerald-50 text-emerald-600",
      },
      {
        key: "single",
        label: "Single Use",
        value: single,
        icon: Layers,
        badgeClass: "bg-violet-50 text-violet-600",
      },
      {
        key: "multi",
        label: "Multi Use",
        value: multi,
        icon: Calendar,
        badgeClass: "bg-amber-50 text-amber-600",
      },
      {
        key: "expired-single",
        label: "Expired Single Use",
        value: expiredSingle,
        icon: AlertTriangle,
        badgeClass: "bg-slate-100 text-slate-600",
      },
      {
        key: "expired-multi",
        label: "Expired Multi Use",
        value: expiredMulti,
        icon: AlertTriangle,
        badgeClass: "bg-orange-50 text-orange-600",
      },
      {
        key: "redeemed",
        label: "Redeemed Coupons",
        value: redeemed,
        icon: CheckCircle2,
        badgeClass: "bg-emerald-50 text-emerald-600",
      },
      {
        key: "not-redeemed",
        label: "Not Redeemed",
        value: notRedeemed,
        icon: CircleDashed,
        badgeClass: "bg-blue-50 text-blue-600",
      },
    ];
  }, [coupons]);

  const filteredCoupons = useMemo(() => {
    const min = parseDiscountBound(filterDiscountMin);
    const max = parseDiscountBound(filterDiscountMax);

    return coupons.filter((coupon) => {
      const type = deriveTypeFromCoupon(coupon);
      if (filterType !== "all" && type !== filterType) {
        return false;
      }

      const matchesStatus = (() => {
        switch (statusFilter) {
          case "active":
            return coupon.isActive !== false;
          case "inactive":
            return coupon.isActive === false;
          case "redeemed":
            return isCouponRedeemed(coupon);
          case "not-redeemed":
            return !isCouponRedeemed(coupon);
          default:
            return true;
        }
      })();

      if (!matchesStatus) {
        return false;
      }

      const discountNumeric = Number(coupon.discountValue) || 0;
      if (min !== null && discountNumeric < min) {
        return false;
      }
      if (max !== null && discountNumeric > max) {
        return false;
      }

      return true;
    });
  }, [coupons, filterDiscountMax, filterDiscountMin, filterType, statusFilter]);

  const selectableIds = useMemo(
    () =>
      filteredCoupons
        .map((coupon) => (coupon?._id ? String(coupon._id) : null))
        .filter(Boolean),
    [filteredCoupons]
  );

  const isAllSelected =
    selectableIds.length > 0 &&
    selectableIds.every((id) => selectedIds.includes(id));

  const selectedCount = selectedIds.length;
  const hasSelection = selectedCount > 0;
  const hasFiltersApplied =
    filterType !== "all" ||
    statusFilter !== "all" ||
    filterDiscountMin !== "" ||
    filterDiscountMax !== "";

  const noCouponsMessage =
    filteredCoupons.length === 0
      ? coupons.length === 0
        ? "No coupons found. Create a coupon to get started."
        : "No coupons match the selected filters."
      : "";

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchValue.trim());
      dispatch(setSellerCouponsPage(1));
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchValue, dispatch]);

  useEffect(() => {
    fetchCurrentCoupons();
  }, [fetchCurrentCoupons]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => selectableIds.includes(id)));
  }, [selectableIds]);

  useEffect(() => {
    if (mutationStatus === "failed" && mutationError) {
      toast.error(mutationError);
    }
  }, [mutationStatus, mutationError]);

  useEffect(() => {
    if (!isImportModalOpen || typeof document === "undefined") {
      return undefined;
    }

    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, [isImportModalOpen]);

  useEffect(() => {
    if (importStatus === "succeeded") {
      const summary = importSummary || {};
      const createdCountCandidate = Number(summary.createdCount);
      const createdCount = Number.isFinite(createdCountCandidate)
        ? createdCountCandidate
        : Array.isArray(summary.created)
        ? summary.created.length
        : readyImportRowCount;
      const errorCountCandidate = Number(summary.errorCount);
      const errorCount = Number.isFinite(errorCountCandidate)
        ? errorCountCandidate
        : Array.isArray(summary.errors)
        ? summary.errors.length
        : 0;
      const totalRowsCandidate = Number(summary.totalRows);
      const totalRows = Number.isFinite(totalRowsCandidate)
        ? totalRowsCandidate
        : createdCount + errorCount;

      const parts = [];
      parts.push(
        `${createdCount} coupon${
          createdCount === 1 ? "" : "s"
        } imported successfully`
      );
      if (errorCount > 0) {
        parts.push(
          `${errorCount} row${
            errorCount === 1 ? "" : "s"
          } skipped due to validation`
        );
      }
      if (totalRows > createdCount && totalRows > 0) {
        parts.push(`Processed ${createdCount}/${totalRows} rows`);
      }

      toast.success(parts.join(". "));
      fetchCurrentCoupons();
      closeImportModal();
    } else if (importStatus === "failed") {
      toast.error(importMessage || "Failed to import coupons");
    }
  }, [
    importStatus,
    importSummary,
    importMessage,
    readyImportRowCount,
    closeImportModal,
    fetchCurrentCoupons,
  ]);

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableIds);
    }
  };

  const handleToggleSelect = (id) => {
    const stringId = String(id);
    setSelectedIds((prev) =>
      prev.includes(stringId)
        ? prev.filter((existing) => existing !== stringId)
        : [...prev, stringId]
    );
  };

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    dispatch(setSellerCouponsPage(1));
  };

  const handleResetFilters = () => {
    setFilterType("all");
    setStatusFilter("all");
    setFilterDiscountMin("");
    setFilterDiscountMax("");
    dispatch(setSellerCouponsPage(1));
  };

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    dispatch(setSellerCouponsPage(nextPage));
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const code = await generateSellerCouponCode();
      setFormState((prev) => ({ ...prev, code }));
      toast.success("Generated coupon code");
    } catch (err) {
      toast.error(err.message || "Unable to generate code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const resetForm = () => {
    setFormState(buildDefaultFormState());
    setEditingCoupon(null);
  };

  const handleTriggerImportFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDownloadImportTemplate = () => {
    const templateRows = [
      {
        code: "WELCOME100",
        description: "₹100 off on first order",
        discountType: "flat",
        discountValue: 100,
        minOrderAmount: 999,
        maxRedemptions: 1,
        maxRedemptionsPerUser: 1,
        startDate: new Date().toISOString().slice(0, 10),
        endDate: "",
        isActive: true,
        type: "single",
      },
      {
        code: "FESTIVE20",
        description: "20% off on festive collection",
        discountType: "percentage",
        discountValue: 20,
        maxDiscountAmount: 500,
        minOrderAmount: 1500,
        maxRedemptions: 200,
        maxRedemptionsPerUser: 2,
        startDate: "",
        endDate: "",
        isActive: true,
        type: "multi",
      },
    ];

    try {
      const worksheet = XLSXUtils.json_to_sheet(templateRows);
      const workbook = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(workbook, worksheet, "Coupons");
      writeXlsxFile(workbook, "seller-coupons-template.xlsx");
      toast.success("Downloaded template");
    } catch (error) {
      console.error("Failed to download template", error);
      toast.error("Unable to download template");
    }
  };

  const handleImportFileSelected = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setIsParsingImport(true);
    setImportParseError("");
    setImportWarnings([]);
    setImportRows([]);
    setImportPreviewRows([]);
    setImportColumns([]);
    setImportSheetName("");
    setImportFileMeta((prev) => ({
      ...prev,
      name: file.name,
      size: file.size,
      lastModified: file.lastModified || Date.now(),
      totalRows: 0,
      processedRows: 0,
    }));

    try {
      const buffer = await file.arrayBuffer();
      const workbook = readXlsx(buffer, {
        type: "array",
        cellDates: true,
        cellText: false,
      });

      const sheetName = workbook.SheetNames?.[0];
      if (!sheetName) {
        throw new Error("No worksheets found in file");
      }

      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSXUtils.sheet_to_json(worksheet, {
        defval: "",
        raw: false,
      });

      if (!rawRows.length) {
        throw new Error("The selected sheet does not contain any rows");
      }

      const { rows: normalizedRows, ignoredHeaders } =
        normalizeImportRows(rawRows);

      if (!normalizedRows.length) {
        throw new Error(
          "No valid coupon rows were detected. Check required fields and try again."
        );
      }

      const detectedColumns = IMPORT_ALLOWED_KEYS.filter((key) =>
        normalizedRows.some((row) => row[key] !== undefined)
      );

      const warnings = [];
      if (ignoredHeaders.length) {
        warnings.push(
          `Ignored columns: ${ignoredHeaders
            .map((header) => `"${header}"`)
            .join(", ")}`
        );
      }
      if (normalizedRows.length < rawRows.length) {
        warnings.push(
          `${
            rawRows.length - normalizedRows.length
          } row(s) were skipped because they were empty or missing values.`
        );
      }

      setImportRows(normalizedRows);
      setImportPreviewRows(normalizedRows.slice(0, IMPORT_PREVIEW_LIMIT));
      setImportColumns(detectedColumns);
      setImportSheetName(sheetName);
      setImportWarnings(warnings);
      setImportFileMeta({
        name: file.name,
        size: file.size,
        lastModified: file.lastModified || Date.now(),
        totalRows: rawRows.length,
        processedRows: normalizedRows.length,
      });
    } catch (error) {
      console.error("Failed to parse import file", error);
      setImportParseError(error.message || "Unable to read the selected file");
    } finally {
      setIsParsingImport(false);
    }
  };

  const handleClearImportData = () => {
    setImportParseError("");
    resetImportState();
  };

  const handleImportSubmit = async (event) => {
    event.preventDefault();
    if (!readyImportRowCount) {
      toast.error("Upload a valid coupon sheet before importing");
      return;
    }

    try {
      await dispatch(importSellerCouponsThunk(importRows)).unwrap();
    } catch (error) {
      console.error("Failed to import seller coupons", error);
    }
  };

  const handleTypeChange = (nextType) => {
    setFormState((prev) => ({
      ...prev,
      type: nextType === "multi" ? "multi" : "single",
      maxRedemptions: nextType === "single" ? "1" : prev.maxRedemptions || "",
      maxRedemptionsPerUser:
        nextType === "single" ? "1" : prev.maxRedemptionsPerUser || "",
    }));
  };

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field) => (event) => {
    const { checked } = event.target;
    setFormState((prev) => ({ ...prev, [field]: checked }));
  };

  const validateForm = () => {
    if (!Number.isFinite(countValue) || countValue < 1) {
      toast.error("Count must be at least 1");
      return false;
    }

    if (isBulkCreate && countValue > 200) {
      toast.error("You can generate up to 200 coupons at a time");
      return false;
    }

    if (!isBulkCreate && !formState.code.trim()) {
      toast.error("Coupon code is required");
      return false;
    }

    const discountValue = Number(formState.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      toast.error("Discount must be a positive number");
      return false;
    }

    if (formState.discountType === "percentage") {
      if (discountValue < 1 || discountValue > 100) {
        toast.error("Percentage discount must be between 1 and 100");
        return false;
      }
    }

    if (formState.type === "multi") {
      if (formState.maxRedemptions.trim()) {
        const maxRedemptions = Number(formState.maxRedemptions);
        if (!Number.isInteger(maxRedemptions) || maxRedemptions < 1) {
          toast.error("Total redemptions must be at least 1");
          return false;
        }
      }

      if (formState.maxRedemptionsPerUser.trim()) {
        const perUser = Number(formState.maxRedemptionsPerUser);
        if (!Number.isInteger(perUser) || perUser < 1) {
          toast.error("Per customer limit must be at least 1");
          return false;
        }
      }
    }

    if (formState.startDate && formState.endDate) {
      const start = new Date(formState.startDate);
      const end = new Date(formState.endDate);
      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        start > end
      ) {
        toast.error("End date must be after start date");
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const isSingle = formState.type === "single";

    const maxDiscountAmount =
      formState.maxDiscountAmount.trim() === ""
        ? undefined
        : Number(formState.maxDiscountAmount);
    const minOrderAmount =
      formState.minOrderAmount.trim() === ""
        ? undefined
        : Number(formState.minOrderAmount);

    const maxRedemptions = isSingle
      ? 1
      : formState.maxRedemptions.trim() === ""
      ? undefined
      : Number(formState.maxRedemptions);

    const maxRedemptionsPerUser = isSingle
      ? 1
      : formState.maxRedemptionsPerUser.trim() === ""
      ? undefined
      : Number(formState.maxRedemptionsPerUser);

    const normalizedCode = formState.code
      ? formState.code.trim().toUpperCase()
      : "";

    return {
      code: normalizedCode,
      description: formState.description.trim() || undefined,
      discountType: formState.discountType === "flat" ? "flat" : "percentage",
      discountValue: Number(formState.discountValue),
      maxDiscountAmount,
      minOrderAmount,
      maxRedemptions,
      maxRedemptionsPerUser,
      startDate: formState.startDate || undefined,
      endDate: formState.endDate || undefined,
      isActive: Boolean(formState.isActive),
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isMutating) return;

    if (!validateForm()) return;

    const payload = buildPayload();

    try {
      if (editingCoupon?._id) {
        await dispatch(
          updateSellerCouponThunk({ id: editingCoupon._id, payload })
        ).unwrap();
        toast.success("Coupon updated successfully");
      } else if (isBulkCreate) {
        for (let index = 0; index < countValue; index += 1) {
          const generatedCode = await generateSellerCouponCode();
          const bulkPayload = {
            ...payload,
            code: generatedCode.trim().toUpperCase(),
          };
          await dispatch(createSellerCouponThunk(bulkPayload)).unwrap();
        }
        toast.success(`Created ${countValue} coupons`);
      } else {
        await dispatch(createSellerCouponThunk(payload)).unwrap();
        toast.success("Coupon created successfully");
      }
      resetForm();
    } catch (err) {
      toast.error(err.message || "Unable to save coupon");
    }
  };

  const handleEdit = (coupon) => {
    if (!coupon) return;
    setEditingCoupon(coupon);
    setFormState({
      code: coupon.code || "",
      description: coupon.description || "",
      discountType: coupon.discountType || "percentage",
      discountValue:
        coupon.discountValue !== undefined ? String(coupon.discountValue) : "",
      maxDiscountAmount:
        coupon.maxDiscountAmount !== undefined &&
        coupon.maxDiscountAmount !== null
          ? String(coupon.maxDiscountAmount)
          : "",
      minOrderAmount:
        coupon.minOrderAmount !== undefined && coupon.minOrderAmount !== null
          ? String(coupon.minOrderAmount)
          : "",
      type: deriveTypeFromCoupon(coupon),
      maxRedemptions:
        coupon.maxRedemptions !== undefined && coupon.maxRedemptions !== null
          ? String(coupon.maxRedemptions)
          : "",
      maxRedemptionsPerUser:
        coupon.maxRedemptionsPerUser !== undefined &&
        coupon.maxRedemptionsPerUser !== null
          ? String(coupon.maxRedemptionsPerUser)
          : "",
      startDate: toDateInputValue(coupon.startDate),
      endDate: toDateInputValue(coupon.endDate),
      isActive: coupon.isActive !== false,
      count: "1",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (coupon) => {
    if (!coupon?._id) return;
    const confirmed = window.confirm(
      `Delete coupon "${coupon.code}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteSellerCouponThunk(coupon._id)).unwrap();
      toast.success("Coupon deleted");
      setSelectedIds((prev) => prev.filter((id) => id !== String(coupon._id)));
    } catch (err) {
      toast.error(err.message || "Unable to delete coupon");
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    const confirmed = window.confirm(
      `Delete ${selectedIds.length} selected coupon${
        selectedIds.length > 1 ? "s" : ""
      }? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteSellerCouponsBulkThunk(selectedIds)).unwrap();
      toast.success("Selected coupons deleted");
      setSelectedIds([]);
    } catch (err) {
      toast.error(
        err.message || "Failed to delete selected coupons. Please retry."
      );
    }
  };

  const handleExportXlsx = () => {
    if (!Array.isArray(filteredCoupons) || filteredCoupons.length === 0) {
      toast.error("No coupons available to export");
      return;
    }

    try {
      const rows = transformSellerCouponsForExport(filteredCoupons);

      if (!rows.length) {
        toast.error("No coupons available to export");
        return;
      }

      const worksheet = XLSXUtils.json_to_sheet(rows);
      const workbook = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(workbook, worksheet, "Coupons");

      const timestamp = new Date();
      const datePart = timestamp.toISOString().slice(0, 10);
      const timePart = timestamp.toISOString().slice(11, 19).replace(/:/g, "");
      const fileName = `seller-coupons-${datePart}-${timePart}.xlsx`;

      writeXlsxFile(workbook, fileName);
      toast.success("Coupons exported successfully");
    } catch (error) {
      console.error("Failed to export seller coupons", error);
      toast.error("Unable to export coupons. Please try again.");
    }
  };

  const handleRefresh = () => {
    const isActiveParam =
      statusFilter === "active"
        ? "true"
        : statusFilter === "inactive"
        ? "false"
        : undefined;

    dispatch(
      fetchSellerCouponsThunk({
        page,
        limit,
        search: debouncedSearch || undefined,
        isActive: isActiveParam,
      })
    );
  };

  const portalTarget =
    typeof document !== "undefined" ? document.body : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 120, damping: 18 }}
      className="flex min-h-screen w-full flex-col gap-6 bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleImportFileSelected}
        className="hidden"
      />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-slate-500">
            Promotions
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Coupons</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage discount codes for your products.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadImportTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
          >
            <Download size={14} /> Template
          </button>
          <button
            type="button"
            onClick={openImportModal}
            className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:border-blue-300 hover:bg-blue-100"
          >
            <Upload size={14} /> Import XLSX
          </button>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map(({ key, label, value, icon: Icon, badgeClass }) => (
          <div
            key={key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <span
                className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
              >
                <Icon size={16} />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="flex flex-wrap items-start justify-between gap-3 sm:items-center">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingCoupon ? "Update Coupon" : "Create Coupon"}
              </h2>
              <p className="text-sm text-slate-500">
                Configure single-use and multi-use coupons for promotions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                disabled={isLoadingList}
              >
                <RefreshCw
                  size={16}
                  className={isLoadingList ? "animate-spin" : ""}
                />
                Refresh
              </button>
              {editingCoupon && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
                  disabled={isMutating}
                >
                  Cancel edit
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => handleTypeChange("single")}
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition sm:flex-1 ${
                    formState.type === "single"
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  Single use
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange("multi")}
                  className={`w-full rounded-xl border px-3 py-2 text-sm font-medium transition sm:flex-1 ${
                    formState.type === "multi"
                      ? "border-blue-500 bg-blue-50 text-blue-600"
                      : "border-slate-200 text-slate-500 hover:border-blue-200 hover:text-blue-600"
                  }`}
                >
                  Multi use
                </button>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="coupon-code"
                    className="text-sm font-medium text-slate-600"
                  >
                    Coupon Code
                  </label>
                  <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      id="coupon-code"
                      name="code"
                      type="text"
                      value={formState.code}
                      onChange={handleInputChange("code")}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-wider text-slate-700 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-slate-100"
                      placeholder={isBulkCreate ? "Auto-generated" : "MEGA50"}
                      maxLength={20}
                      required={!isBulkCreate}
                      disabled={isBulkCreate}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateCode}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:bg-slate-100"
                      disabled={isGeneratingCode || isMutating || isBulkCreate}
                    >
                      {isGeneratingCode ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      Generate
                    </button>
                  </div>
                  {isBulkCreate && (
                    <p className="mt-1 text-xs text-slate-500">
                      Codes will be generated automatically for bulk creation.
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="coupon-description"
                    className="text-sm font-medium text-slate-600"
                  >
                    Description
                  </label>
                  <textarea
                    id="coupon-description"
                    name="description"
                    value={formState.description}
                    onChange={handleInputChange("description")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                    rows={2}
                    placeholder="E.g. 15% off on prepaid orders"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="coupon-discount-value"
                      className="text-sm font-medium text-slate-600"
                    >
                      Discount (
                      {formState.discountType === "percentage" ? "%" : "INR"})
                    </label>
                    <input
                      id="coupon-discount-value"
                      name="discountValue"
                      type="number"
                      min={1}
                      value={formState.discountValue}
                      onChange={handleInputChange("discountValue")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      placeholder={
                        formState.discountType === "percentage" ? "10" : "100"
                      }
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coupon-discount-type"
                      className="text-sm font-medium text-slate-600"
                    >
                      Discount Type
                    </label>
                    <select
                      id="coupon-discount-type"
                      name="discountType"
                      value={formState.discountType}
                      onChange={handleInputChange("discountType")}
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat (INR)</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="coupon-max-discount"
                      className="text-sm font-medium text-slate-600"
                    >
                      Max Discount Amount (optional)
                    </label>
                    <input
                      id="coupon-max-discount"
                      name="maxDiscountAmount"
                      type="number"
                      min={0}
                      value={formState.maxDiscountAmount}
                      onChange={handleInputChange("maxDiscountAmount")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      placeholder="500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coupon-min-order"
                      className="text-sm font-medium text-slate-600"
                    >
                      Minimum Order Amount
                    </label>
                    <input
                      id="coupon-min-order"
                      name="minOrderAmount"
                      type="number"
                      min={0}
                      value={formState.minOrderAmount}
                      onChange={handleInputChange("minOrderAmount")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      placeholder="1000"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input
                      id="coupon-active"
                      type="checkbox"
                      checked={formState.isActive}
                      onChange={handleCheckboxChange("isActive")}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label
                      htmlFor="coupon-active"
                      className="text-sm text-slate-600"
                    >
                      Mark as active immediately
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700">
                Usage limits
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Configure how many times the coupon can be redeemed overall and
                per customer.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label
                    htmlFor="coupon-count"
                    className="text-sm font-medium text-slate-600"
                  >
                    Number of coupons to generate
                  </label>
                  <input
                    id="coupon-count"
                    name="count"
                    type="number"
                    min={1}
                    value={formState.count}
                    onChange={handleInputChange("count")}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                    placeholder="1"
                    disabled={isEditing}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    Enter how many codes to generate (max 200 per batch).
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="coupon-max-redemptions"
                      className="text-sm font-medium text-slate-600"
                    >
                      Total Redemptions
                      {formState.type === "multi"
                        ? " (leave blank for unlimited)"
                        : ""}
                    </label>
                    <input
                      id="coupon-max-redemptions"
                      name="maxRedemptions"
                      type="number"
                      min={formState.type === "single" ? 1 : 0}
                      value={formState.maxRedemptions}
                      onChange={handleInputChange("maxRedemptions")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      placeholder={
                        formState.type === "single" ? "1" : "Unlimited"
                      }
                      disabled={formState.type === "single"}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coupon-max-redemptions-per-user"
                      className="text-sm font-medium text-slate-600"
                    >
                      Per Customer Limit
                      {formState.type === "multi"
                        ? " (leave blank for unlimited)"
                        : ""}
                    </label>
                    <input
                      id="coupon-max-redemptions-per-user"
                      name="maxRedemptionsPerUser"
                      type="number"
                      min={formState.type === "single" ? 1 : 0}
                      value={formState.maxRedemptionsPerUser}
                      onChange={handleInputChange("maxRedemptionsPerUser")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                      placeholder={
                        formState.type === "single" ? "1" : "Unlimited"
                      }
                      disabled={formState.type === "single"}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="coupon-start-date"
                      className="text-sm font-medium text-slate-600"
                    >
                      Start Date
                    </label>
                    <input
                      id="coupon-start-date"
                      name="startDate"
                      type="date"
                      value={formState.startDate}
                      onChange={handleInputChange("startDate")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="coupon-end-date"
                      className="text-sm font-medium text-slate-600"
                    >
                      End Date
                    </label>
                    <input
                      id="coupon-end-date"
                      name="endDate"
                      type="date"
                      value={formState.endDate}
                      onChange={handleInputChange("endDate")}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isMutating || isGeneratingCode}
                  >
                    {isMutating ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Plus size={16} />
                    )}
                    {editingCoupon ? "Update Coupon" : "Create Coupon"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                    disabled={isMutating}
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex w-full items-center gap-3 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm sm:w-auto">
              <Search size={18} className="text-slate-400" />
              <input
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Search by code or description"
                className="h-10 flex-1 bg-transparent text-sm placeholder:text-slate-400 focus:outline-none sm:h-8 sm:w-52 sm:flex-none"
              />
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 shadow-sm sm:w-auto">
              <FilterSelect
                value={filterType}
                onValueChange={setFilterType}
                options={TYPE_FILTER_OPTIONS}
                ariaLabel="Filter coupons by type"
              />
              <FilterSelect
                value={statusFilter}
                onValueChange={handleStatusFilterChange}
                options={STATUS_FILTER_OPTIONS}
                ariaLabel="Filter coupons by status"
              />
              <div className="flex items-center gap-1">
                <label htmlFor="seller-filter-discount-min" className="sr-only">
                  Minimum discount percentage
                </label>
                <input
                  id="seller-filter-discount-min"
                  name="filterDiscountMin"
                  type="number"
                  min={0}
                  max={100}
                  value={filterDiscountMin}
                  onChange={(event) => setFilterDiscountMin(event.target.value)}
                  className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Min %"
                  aria-label="Minimum discount percentage"
                />
                <span className="text-xs font-medium text-slate-400">-</span>
                <label htmlFor="seller-filter-discount-max" className="sr-only">
                  Maximum discount percentage
                </label>
                <input
                  id="seller-filter-discount-max"
                  name="filterDiscountMax"
                  type="number"
                  min={0}
                  max={100}
                  value={filterDiscountMax}
                  onChange={(event) => setFilterDiscountMax(event.target.value)}
                  className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  placeholder="Max %"
                  aria-label="Maximum discount percentage"
                />
              </div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-semibold text-slate-500 transition hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!hasFiltersApplied}
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleBulkDelete}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!hasSelection || isMutating}
            >
              <Trash2 size={14} /> Delete selected
            </button>
            <button
              type="button"
              onClick={handleExportXlsx}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoadingList || coupons.length === 0}
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {error && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 sm:px-5">
            {error}
          </div>
        )}

        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={isAllSelected && hasSelection}
                      onChange={handleToggleSelectAll}
                      aria-label={
                        isAllSelected
                          ? "Deselect all coupons"
                          : "Select all coupons"
                      }
                    />
                  </th>
                  <th className="px-4 py-3 text-left">Code</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Discount</th>
                  <th className="px-4 py-3 text-left">Usage</th>
                  <th className="px-4 py-3 text-left">Validity</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingList && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-6 text-center text-slate-500 sm:px-5"
                    >
                      <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500">
                        <Loader2
                          size={16}
                          className="animate-spin text-blue-500"
                        />
                        Loading coupons...
                      </div>
                    </td>
                  </tr>
                )}

                {!isLoadingList && filteredCoupons.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-8 text-center text-slate-500 sm:px-5"
                    >
                      {noCouponsMessage}
                    </td>
                  </tr>
                )}

                {!isLoadingList &&
                  filteredCoupons.map((coupon) => {
                    const discountLabel =
                      coupon.discountType === "percentage"
                        ? `${coupon.discountValue || 0}%`
                        : formatCurrency(coupon.discountValue);

                    const validityLabel =
                      coupon.startDate || coupon.endDate
                        ? `${formatDate(coupon.startDate)} - ${formatDate(
                            coupon.endDate
                          )}`
                        : "No expiry";

                    const type = deriveTypeFromCoupon(coupon);
                    const isActive = coupon.isActive !== false;
                    const redeemed = isCouponRedeemed(coupon);

                    return (
                      <tr key={coupon._id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-4 align-top sm:px-5">
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedIds.includes(String(coupon._id))}
                            onChange={() => handleToggleSelect(coupon._id)}
                            aria-label={`Select coupon ${coupon.code}`}
                          />
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">
                              {coupon.code}
                            </p>
                            {coupon.description && (
                              <p className="text-xs text-slate-500">
                                {coupon.description}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <div className="flex flex-col gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                type === "single"
                                  ? "bg-violet-50 text-violet-600"
                                  : "bg-amber-50 text-amber-600"
                              }`}
                            >
                              {type === "single" ? "Single Use" : "Multi Use"}
                            </span>
                            <p className="text-xs text-slate-500">
                              {type === "single"
                                ? "One-time use"
                                : "Reusable with limits"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <p className="font-medium text-slate-900">
                            {discountLabel}
                          </p>
                          {coupon.maxDiscountAmount !== undefined && (
                            <p className="text-xs text-slate-500">
                              Cap: {formatCurrency(coupon.maxDiscountAmount)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <p className="font-medium text-slate-900">
                            {remainingLabel(coupon)}
                          </p>
                          <p className="text-xs text-slate-500">
                            Used {coupon.usageCount || 0} times
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <p className="font-medium text-slate-900">
                            {validityLabel}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-top sm:px-5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                isActive
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {isActive ? "Active" : "Inactive"}
                            </span>
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                                redeemed
                                  ? "bg-rose-50 text-rose-600"
                                  : "bg-blue-50 text-blue-600"
                              }`}
                            >
                              {redeemed ? "Redeemed" : "Not Redeemed"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top text-right sm:px-5">
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(coupon)}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                            >
                              <Pencil size={14} />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(coupon)}
                              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                              disabled={isMutating}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-t border-slate-100 px-4 py-4 lg:hidden sm:px-5">
          {isLoadingList && (
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                Loading coupons...
              </div>
            </div>
          )}

          {!isLoadingList && filteredCoupons.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">
              {noCouponsMessage}
            </p>
          )}

          {!isLoadingList && filteredCoupons.length > 0 && (
            <div className="space-y-4">
              {filteredCoupons.map((coupon) => {
                const discountLabel =
                  coupon.discountType === "percentage"
                    ? `${coupon.discountValue || 0}%`
                    : formatCurrency(coupon.discountValue);

                const validityLabel =
                  coupon.startDate || coupon.endDate
                    ? `${formatDate(coupon.startDate)} - ${formatDate(
                        coupon.endDate
                      )}`
                    : "No expiry";

                const type = deriveTypeFromCoupon(coupon);
                const isActive = coupon.isActive !== false;
                const redeemed = isCouponRedeemed(coupon);
                const typeBadgeClass =
                  type === "single"
                    ? "bg-violet-50 text-violet-600"
                    : "bg-amber-50 text-amber-600";

                return (
                  <div
                    key={coupon._id}
                    className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-base font-semibold text-slate-900">
                          {coupon.code}
                        </p>
                        {coupon.description && (
                          <p className="text-xs text-slate-500">
                            {coupon.description}
                          </p>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        checked={selectedIds.includes(String(coupon._id))}
                        onChange={() => handleToggleSelect(coupon._id)}
                        aria-label={`Select coupon ${coupon.code}`}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-600"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          redeemed
                            ? "bg-rose-50 text-rose-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {redeemed ? "Redeemed" : "Not Redeemed"}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${typeBadgeClass}`}
                      >
                        {type === "single" ? "Single Use" : "Multi Use"}
                      </span>
                    </div>

                    <div className="grid gap-3 text-sm">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Discount
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {discountLabel}
                        </p>
                        {coupon.maxDiscountAmount !== undefined && (
                          <p className="text-xs text-slate-500">
                            Cap: {formatCurrency(coupon.maxDiscountAmount)}
                          </p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Usage
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {remainingLabel(coupon)}
                        </p>
                        <p className="text-xs text-slate-500">
                          Used {coupon.usageCount || 0} times
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                          Validity
                        </p>
                        <p className="mt-1 font-semibold text-slate-900">
                          {validityLabel}
                        </p>
                      </div>

                      {coupon.minOrderAmount !== undefined &&
                        coupon.minOrderAmount !== null && (
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                              Minimum Order
                            </p>
                            <p className="mt-1 font-semibold text-slate-900">
                              {formatCurrency(coupon.minOrderAmount)}
                            </p>
                          </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(coupon)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 sm:flex-none sm:px-4"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100 sm:flex-none sm:px-4"
                        disabled={isMutating}
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <footer className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center">
          <span>
            {meta.total > 0
              ? `Showing ${
                  (page - 1) * limit + (coupons.length ? 1 : 0) || 1
                }-${(page - 1) * limit + coupons.length} of ${meta.total}`
              : "No coupons to display"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isLoadingList}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="font-semibold text-slate-700">
              {isLoadingList ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                page
              )}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoadingList}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 transition enabled:hover:border-blue-200 enabled:hover:bg-blue-50 enabled:hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </footer>
      </section>

      {portalTarget &&
        createPortal(
          <AnimatePresence>
            {isImportModalOpen && (
              <motion.div
                key="import-modal"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 px-4 py-8"
              >
                <motion.form
                  onSubmit={handleImportSubmit}
                  initial={{ scale: 0.95, opacity: 0, y: 16 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 16 }}
                  transition={{ type: "spring", stiffness: 240, damping: 28 }}
                  className="relative flex w-full max-w-5xl max-h-[calc(100vh-3rem)] flex-col gap-5 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Import coupons from spreadsheet
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload an XLSX file with coupon details. You can
                        download the template for the exact column structure.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadImportTemplate}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        <Download size={14} /> Template
                      </button>
                      <button
                        type="button"
                        onClick={closeImportModal}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                        aria-label="Close import modal"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-600">
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            <Upload size={14} className="text-blue-500" />
                            {importFileMeta.name
                              ? importFileMeta.name
                              : "No file selected"}
                          </span>
                          {importFileMeta.size > 0 && (
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                              {formatFileSize(importFileMeta.size)}
                            </span>
                          )}
                          {importSheetName && (
                            <span className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                              Sheet: {importSheetName}
                            </span>
                          )}
                          {importFileMeta.totalRows > 0 && (
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-slate-500">
                              Rows: {importFileMeta.processedRows}/
                              {importFileMeta.totalRows}
                            </span>
                          )}
                        </div>

                        {importParseError && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                            {importParseError}
                          </div>
                        )}

                        {!!importWarnings.length && (
                          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                            <p className="font-semibold uppercase tracking-wide">
                              Warnings
                            </p>
                            <ul className="mt-2 space-y-1">
                              {importWarnings.map((warning, index) => (
                                <li key={index}>● {warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {importErrorsList.length > 0 && (
                          <div className="rounded-2xl border border-rose-200 bg-white px-4 py-3 text-xs text-rose-600">
                            <p className="font-semibold uppercase tracking-wide">
                              Backend validation issues
                            </p>
                            <ul className="mt-2 space-y-1">
                              {importErrorsList
                                .slice(0, 10)
                                .map((err, index) => (
                                  <li key={index}>
                                    Row{" "}
                                    {typeof err.index === "number"
                                      ? err.index + 1
                                      : "?"}
                                    : {err.message || "Invalid data"}
                                  </li>
                                ))}
                            </ul>
                            {importErrorsList.length > 10 && (
                              <p className="mt-2 text-[11px] text-slate-500">
                                Showing first 10 errors. Check the downloaded
                                error log for the full list.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-900">
                              Preview
                            </h3>
                            <p className="text-xs text-slate-500">
                              Showing up to {IMPORT_PREVIEW_LIMIT} rows from the
                              file
                            </p>
                          </div>
                          {isImportProcessing ? (
                            <div className="mt-6 flex items-center justify-center text-sm text-slate-500">
                              <Loader2
                                size={18}
                                className="mr-2 animate-spin text-blue-500"
                              />
                              Reading file...
                            </div>
                          ) : readyImportRowCount > 0 ? (
                            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100">
                              <div className="max-h-72 overflow-auto">
                                <table className="w-full table-fixed divide-y divide-slate-100 text-sm">
                                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                      {importColumns.map((column) => (
                                        <th
                                          key={column}
                                          className="break-words px-4 py-3 text-left align-top"
                                        >
                                          {IMPORT_LABEL_MAP[column] || column}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 bg-white text-xs text-slate-600">
                                    {importPreviewRows.map((row, rowIndex) => (
                                      <tr key={rowIndex}>
                                        {importColumns.map((column) => (
                                          <td
                                            key={column}
                                            className="break-words px-4 py-2 align-top"
                                          >
                                            {row[column] !== undefined &&
                                            row[column] !== ""
                                              ? String(row[column])
                                              : "--"}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                              Upload an XLSX file to preview coupon rows.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={handleTriggerImportFileDialog}
                        disabled={isImportProcessing}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Upload size={14} /> Choose file
                      </button>
                      <button
                        type="button"
                        onClick={handleClearImportData}
                        disabled={isImportProcessing}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={closeImportModal}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isImportProcessing || readyImportRowCount === 0
                        }
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isImportProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Upload size={16} />
                        )}
                        Import coupons
                      </button>
                    </div>
                  </div>
                </motion.form>
              </motion.div>
            )}
          </AnimatePresence>,
          portalTarget
        )}
    </motion.div>
  );
};

export default SellerCoupons;
