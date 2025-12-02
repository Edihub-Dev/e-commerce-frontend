import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus,
  RefreshCw,
  Loader2,
  Pencil,
  Trash2,
  Calendar,
  ShieldCheck,
  Tag,
  Layers,
  X,
  AlertTriangle,
  Lock,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  fetchAdminCouponsThunk,
  createAdminCouponThunk,
  createAdminCouponsBulkThunk,
  updateAdminCouponThunk,
  deleteAdminCouponThunk,
} from "../store/thunks/adminCouponsThunks";
import { generateAdminCouponCode } from "../services/adminCouponsApi";

const buildDefaultFormState = (type = "single") => ({
  code: "",
  description: "",
  type,
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  maxRedemptions: type === "single" ? "1" : "",
  maxRedemptionsPerUser: type === "single" ? "1" : "",
  startDate: "",
  endDate: "",
  isActive: true,
  count: "1",
});

const toDateInputValue = (value) => {
  if (!value) return "";
  try {
    return value.slice(0, 10);
  } catch (_error) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  }
};

const formatDateDisplay = (value) => {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === "") {
    return "--";
  }
  const numeric = Number(amount);
  if (!Number.isFinite(numeric)) return "--";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(numeric);
};

const AdminCouponsPage = () => {
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const {
    items: coupons,
    status,
    error,
    mutationStatus,
    mutationError,
  } = useAppSelector((state) => state.adminCoupons);

  const [formState, setFormState] = useState(buildDefaultFormState());
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const isEditing = Boolean(editingCoupon);
  const countValue = Number(formState.count || "1");
  const isBulkCreate =
    !isEditing && Number.isFinite(countValue) && countValue > 1;

  const isFetching = status === "loading";
  const isMutating = mutationStatus === "loading";

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchAdminCouponsThunk());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (mutationStatus === "failed" && mutationError) {
      toast.error(mutationError);
    }
  }, [mutationStatus, mutationError]);

  const summary = useMemo(() => {
    const total = coupons.length;
    const active = coupons.filter((coupon) => coupon.isActive !== false).length;
    const single = coupons.filter((coupon) => coupon.type === "single").length;
    const multi = coupons.filter((coupon) => coupon.type === "multi").length;
    const expiredSingle = coupons.filter(
      (coupon) => coupon.type === "single" && coupon.isActive === false
    ).length;
    const expiredMulti = coupons.filter(
      (coupon) => coupon.type === "multi" && coupon.isActive === false
    ).length;
    const redeemed = coupons.filter((coupon) => coupon.isFullyRedeemed).length;
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
        icon: Lock,
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

  const handleTypeChange = (nextType) => {
    setFormState((prev) => {
      const base = buildDefaultFormState(
        nextType === "multi" ? "multi" : "single"
      );
      return {
        ...base,
        count: prev.count || "1",
      };
    });
    setEditingCoupon((prev) => (prev && prev.type !== nextType ? null : prev));
  };

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
      const code = await generateAdminCouponCode();
      setFormState((prev) => ({ ...prev, code }));
      toast.success("Generated coupon code");
    } catch (genError) {
      toast.error(genError.message || "Unable to generate code");
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const resetForm = useCallback(() => {
    setFormState(buildDefaultFormState());
    setEditingCoupon(null);
  }, []);

  const handleInputChange = (field) => (event) => {
    const { value } = event.target;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleCheckboxChange = (field) => (event) => {
    const { checked } = event.target;
    setFormState((prev) => ({ ...prev, [field]: checked }));
  };

  const validateForm = () => {
    if (!isBulkCreate && !formState.code.trim()) {
      toast.error("Coupon code is required");
      return false;
    }

    const discountValue = Number(formState.discountValue);
    if (
      !Number.isFinite(discountValue) ||
      discountValue < 1 ||
      discountValue > 100
    ) {
      toast.error("Discount must be between 1 and 100");
      return false;
    }

    const minOrderValue = formState.minOrderAmount.trim();
    if (minOrderValue && Number(minOrderValue) < 0) {
      toast.error("Minimum order amount cannot be negative");
      return false;
    }

    if (formState.type === "multi") {
      if (formState.maxRedemptions.trim()) {
        const maxRedemptions = Number(formState.maxRedemptions);
        if (!Number.isFinite(maxRedemptions) || maxRedemptions < 1) {
          toast.error("Total redemptions must be at least 1");
          return false;
        }
      }

      if (formState.maxRedemptionsPerUser.trim()) {
        const perUser = Number(formState.maxRedemptionsPerUser);
        if (!Number.isFinite(perUser) || perUser < 1) {
          toast.error("Per user limit must be at least 1");
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

    if (!isEditing) {
      if (!Number.isFinite(countValue) || countValue < 1) {
        toast.error("Count must be at least 1");
        return false;
      }
    }

    return true;
  };

  const buildPayload = () => {
    const type = formState.type === "multi" ? "multi" : "single";
    const normalized = {
      code: formState.code.trim().toUpperCase(),
      description: formState.description.trim() || undefined,
      type,
      discountValue: Number(formState.discountValue),
      maxDiscountAmount: formState.maxDiscountAmount.trim()
        ? Number(formState.maxDiscountAmount)
        : null,
      minOrderAmount: formState.minOrderAmount.trim()
        ? Number(formState.minOrderAmount)
        : 0,
      maxRedemptions:
        type === "single"
          ? 1
          : formState.maxRedemptions.trim()
          ? Number(formState.maxRedemptions)
          : null,
      maxRedemptionsPerUser:
        type === "single"
          ? 1
          : formState.maxRedemptionsPerUser.trim()
          ? Number(formState.maxRedemptionsPerUser)
          : null,
      startDate: formState.startDate || null,
      endDate: formState.endDate || null,
      isActive: Boolean(formState.isActive),
    };

    return normalized;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isMutating) return;

    if (!validateForm()) {
      return;
    }

    const payload = buildPayload();

    try {
      if (editingCoupon?._id) {
        await dispatch(
          updateAdminCouponThunk({ id: editingCoupon._id, payload })
        ).unwrap();
        toast.success("Coupon updated successfully");
      } else {
        if (isBulkCreate) {
          await dispatch(
            createAdminCouponsBulkThunk({ ...payload, count: countValue })
          ).unwrap();
          toast.success(`Created ${countValue} coupons`);
        } else {
          await dispatch(createAdminCouponThunk(payload)).unwrap();
          toast.success("Coupon created successfully");
        }
      }
      resetForm();
      if (status !== "loading") {
        dispatch(fetchAdminCouponsThunk());
      }
    } catch (submitError) {
      const message =
        submitError?.message || "Unable to save coupon. Please try again.";
      toast.error(message);
    }
  };

  const handleEdit = (coupon) => {
    if (!coupon) return;
    setEditingCoupon(coupon);
    setFormState({
      code: coupon.code || "",
      description: coupon.description || "",
      type: coupon.type || "single",
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
      maxRedemptions:
        coupon.type === "single"
          ? "1"
          : coupon.maxRedemptions !== undefined &&
            coupon.maxRedemptions !== null
          ? String(coupon.maxRedemptions)
          : "",
      maxRedemptionsPerUser:
        coupon.type === "single"
          ? "1"
          : coupon.maxRedemptionsPerUser !== undefined &&
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
      await dispatch(deleteAdminCouponThunk(coupon._id)).unwrap();
      toast.success("Coupon deleted");
    } catch (deleteError) {
      const message =
        deleteError?.message || "Unable to delete coupon. Please try again.";
      toast.error(message);
    }
  };

  const handleRefresh = () => {
    dispatch(fetchAdminCouponsThunk());
  };

  const renderStatusBadge = (coupon) => {
    const isActive = coupon.isActive !== false;
    const baseClass = isActive
      ? "bg-emerald-50 text-emerald-600"
      : "bg-slate-200 text-slate-600";
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${baseClass}`}
      >
        {isActive ? "Active" : "Inactive"}
      </span>
    );
  };

  const renderRedemptionBadge = (coupon) => {
    const isRedeemed = Boolean(coupon.isFullyRedeemed);
    const baseClass = isRedeemed
      ? "bg-rose-50 text-rose-600"
      : "bg-blue-50 text-blue-600";
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${baseClass}`}
      >
        {isRedeemed ? "Redeemed" : "Not Redeemed"}
      </span>
    );
  };

  const renderTypeBadge = (coupon) => {
    const isSingle = coupon.type === "single";
    const baseClass = isSingle
      ? "bg-violet-50 text-violet-600"
      : "bg-amber-50 text-amber-600";
    return (
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${baseClass}`}
      >
        {isSingle ? "Single Use" : "Multi Use"}
      </span>
    );
  };

  const remainingLabel = (coupon) => {
    if (coupon.type === "single") {
      return coupon.usageCount >= 1 ? "0 of 1" : "1 of 1";
    }
    if (coupon.maxRedemptions) {
      const remaining = Math.max(
        coupon.maxRedemptions - (coupon.usageCount || 0),
        0
      );
      return `${remaining} of ${coupon.maxRedemptions}`;
    }
    return "Unlimited";
  };

  const renderForm = () => (
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
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : ""} />
            Refresh
          </button>
          {editingCoupon && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-100"
              disabled={isMutating}
            >
              <X size={16} /> Cancel edit
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
              <label className="text-sm font-medium text-slate-600">
                Coupon Code
              </label>
              <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  type="text"
                  value={formState.code}
                  onChange={handleInputChange("code")}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm uppercase tracking-wider text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder={isBulkCreate ? "Auto-generated" : "MEGA50"}
                  maxLength={20}
                  required={!isBulkCreate}
                  disabled={isBulkCreate}
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
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
              <label className="text-sm font-medium text-slate-600">
                Description
              </label>
              <textarea
                value={formState.description}
                onChange={handleInputChange("description")}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                rows={2}
                placeholder="E.g. 15% off on prepaid orders"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Discount (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={formState.discountValue}
                  onChange={handleInputChange("discountValue")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="10"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Max Discount Amount (optional)
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.maxDiscountAmount}
                  onChange={handleInputChange("maxDiscountAmount")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Minimum Order Amount
                </label>
                <input
                  type="number"
                  min={0}
                  value={formState.minOrderAmount}
                  onChange={handleInputChange("minOrderAmount")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="1000"
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
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
          <h3 className="text-sm font-semibold text-slate-700">Usage limits</h3>
          <p className="mt-1 text-xs text-slate-500">
            Configure how many times the coupon can be redeemed overall and per
            customer.
          </p>

          <div className="mt-4 space-y-4">
            {!isEditing && (
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Number of coupons to generate
                </label>
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={formState.count}
                  onChange={handleInputChange("count")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder="1"
                />
                <p className="mt-1 text-xs text-slate-500">
                  A unique code will be generated for each coupon when count is
                  greater than 1.
                </p>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Total Redemptions
                  {formState.type === "multi"
                    ? " (leave blank for unlimited)"
                    : ""}
                </label>
                <input
                  type="number"
                  min={formState.type === "single" ? 1 : 0}
                  value={formState.maxRedemptions}
                  onChange={handleInputChange("maxRedemptions")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder={formState.type === "single" ? "1" : "Unlimited"}
                  disabled={formState.type === "single"}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Per Customer Limit
                  {formState.type === "multi"
                    ? " (leave blank for unlimited)"
                    : ""}
                </label>
                <input
                  type="number"
                  min={formState.type === "single" ? 1 : 0}
                  value={formState.maxRedemptionsPerUser}
                  onChange={handleInputChange("maxRedemptionsPerUser")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  placeholder={formState.type === "single" ? "1" : "Unlimited"}
                  disabled={formState.type === "single"}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-600">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formState.startDate}
                  onChange={handleInputChange("startDate")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-600">
                  End Date
                </label>
                <input
                  type="date"
                  value={formState.endDate}
                  onChange={handleInputChange("endDate")}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
    </form>
  );

  const renderTable = () => (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-900">Coupons</h3>
          <p className="text-sm text-slate-500">
            Track and manage coupon codes applied during checkout and payment.
          </p>
        </div>
      </div>

      {error && (
        <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 sm:px-5">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3 text-left">Code</th>
              <th className="px-5 py-3 text-left">Type</th>
              <th className="px-5 py-3 text-left">Discount</th>
              <th className="px-5 py-3 text-left">Min Order</th>
              <th className="px-5 py-3 text-left">Usage</th>
              <th className="px-5 py-3 text-left">Date Range</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isFetching && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-500 sm:px-5"
                >
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                    Loading coupons...
                  </div>
                </td>
              </tr>
            )}

            {!isFetching && coupons.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-6 text-center text-slate-500 sm:px-5"
                >
                  No coupons found. Create a coupon to get started.
                </td>
              </tr>
            )}

            {!isFetching &&
              coupons.map((coupon) => (
                <tr key={coupon._id} className="hover:bg-slate-50/60">
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
                      {renderTypeBadge(coupon)}
                      <p className="text-xs text-slate-500">
                        {coupon.type === "single"
                          ? "One-time use"
                          : "Reusable with limits"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top sm:px-5">
                    <p className="font-medium text-slate-900">
                      {coupon.discountValue}%
                    </p>
                    <p className="text-xs text-slate-500">
                      Cap: {formatCurrency(coupon.maxDiscountAmount)}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top sm:px-5">
                    <p className="font-medium text-slate-900">
                      {formatCurrency(coupon.minOrderAmount)}
                    </p>
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
                      {coupon.startDate
                        ? formatDateDisplay(coupon.startDate)
                        : "Immediately"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {coupon.endDate
                        ? formatDateDisplay(coupon.endDate)
                        : "No end date"}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-top sm:px-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {renderStatusBadge(coupon)}
                      {renderRedemptionBadge(coupon)}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-right sm:px-5">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(coupon)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(coupon)}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-100"
                        disabled={isMutating}
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          active="Coupons"
          className="hidden lg:flex lg:w-64 lg:flex-none"
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
                  active="Coupons"
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
            notifications={null}
            showRangeSelector={false}
            showNotifications={false}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {summary.map(({ key, label, value, icon: Icon, badgeClass }) => (
                <div
                  key={key}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">
                      {label}
                    </p>
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

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {renderForm()}
            </section>

            <section>{renderTable()}</section>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminCouponsPage;
