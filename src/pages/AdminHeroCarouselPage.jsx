import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import {
  fetchAdminHeroCarouselThunk,
  createAdminHeroCarouselThunk,
  updateAdminHeroCarouselThunk,
  deleteAdminHeroCarouselThunk,
  reorderAdminHeroCarouselThunk,
} from "../store/thunks/adminHeroCarouselThunks";
import { useAuth } from "../contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Loader2,
  Trash2,
  Edit,
  GripVertical,
  ImagePlus,
  Save,
} from "lucide-react";
import { toast } from "react-hot-toast";
import debounce from "lodash.debounce";

const emptySlide = {
  title: "",
  description: "",
  overline: "",
  titleColor: "",
  overlineColor: "",
  descriptionColor: "",
  imageUrl: "",
  primaryCta: { label: "", href: "" },
  secondaryCta: { label: "", href: "" },
  showPrimaryCta: true,
  showSecondaryCta: true,
  showTitle: true,
  showOverline: true,
  showDescription: true,
  metadata: { productId: "" },
  isActive: true,
  order: 0,
};

const STORAGE_KEY = "admin-hero-carousel-draft";

const MAX_IMAGE_SIZE_BYTES = 3 * 1024 * 1024; // 3MB

const getMetadataValue = (metadata, key) => {
  if (!metadata) {
    return "";
  }

  if (typeof metadata.get === "function") {
    const value = metadata.get(key);
    return typeof value === "string"
      ? value
      : value != null
      ? String(value)
      : "";
  }

  const raw = metadata[key];
  if (raw == null) {
    return "";
  }

  return typeof raw === "string" ? raw : String(raw);
};

const DragHandle = () => (
  <span className="flex cursor-grab items-center text-slate-400">
    <GripVertical size={18} />
  </span>
);

const SlideForm = ({ draft, onChange, onSave, onCancel, isSaving }) => {
  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    onChange({ ...draft, [field]: value });
  };

  const handleCtaChange = (ctaKey, field) => (event) => {
    const value = event.target.value;
    onChange({
      ...draft,
      [ctaKey]: {
        ...(draft[ctaKey] || {}),
        [field]: value,
      },
    });
  };

  const handleMetadataChange = (field) => (event) => {
    const value = event.target.value;
    onChange({
      ...draft,
      metadata: {
        ...(draft.metadata || {}),
        [field]: value,
      },
    });
  };

  const [uploadingField, setUploadingField] = useState(null);

  const readFileAsDataURL = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });

  const handleFileUpload = (field, label) => async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error("Image must be smaller than 3MB");
      event.target.value = "";
      return;
    }

    setUploadingField(field);
    try {
      const dataUrl = await readFileAsDataURL(file);
      onChange({ ...draft, [field]: dataUrl });
      toast.success(`${label} ready to upload`);
    } catch (error) {
      toast.error("Failed to process image");
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  };

  const handleClearImage = (field) => () => {
    onChange({ ...draft, [field]: "" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Title *</span>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={draft.showTitle}
              onChange={handleChange("showTitle")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show title
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={draft.title}
            onChange={handleChange("title")}
            maxLength={120}
            required
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Overline</span>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={draft.showOverline}
              onChange={handleChange("showOverline")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show overline
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={draft.overline}
            onChange={handleChange("overline")}
            maxLength={160}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Priority</span>
          <input
            type="number"
            className="w-full rounded-lg border border-slate-200 px-3 py-2"
            value={draft.order ?? 0}
            onChange={handleChange("order")}
            min={0}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Title Color</span>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2"
            value={draft.titleColor || "#ffffff"}
            onChange={handleChange("titleColor")}
          />
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => onChange({ ...draft, titleColor: "" })}
          >
            Reset
          </button>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Overline Color</span>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2"
            value={draft.overlineColor || "#ffffff"}
            onChange={handleChange("overlineColor")}
          />
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => onChange({ ...draft, overlineColor: "" })}
          >
            Reset
          </button>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium text-slate-600">Description Color</span>
          <input
            type="color"
            className="h-10 w-full cursor-pointer rounded-lg border border-slate-200 px-3 py-2"
            value={draft.descriptionColor || "#d1d5db"}
            onChange={handleChange("descriptionColor")}
          />
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-700"
            onClick={() => onChange({ ...draft, descriptionColor: "" })}
          >
            Reset
          </button>
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-600">Description</span>
        <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={draft.showDescription}
            onChange={handleChange("showDescription")}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          Show description
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          rows={3}
          value={draft.description}
          onChange={handleChange("description")}
          maxLength={300}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium text-slate-600">Primary Image URL *</span>
        <input
          type="url"
          className="w-full rounded-lg border border-slate-200 px-3 py-2"
          value={draft.imageUrl}
          onChange={handleChange("imageUrl")}
          required
        />
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-500">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload("imageUrl", "Primary image")}
            className="max-w-xs text-xs text-slate-500 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-blue-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white file:shadow-sm hover:file:bg-blue-500"
          />
          {uploadingField === "imageUrl" && (
            <span className="inline-flex items-center gap-1 text-blue-600">
              <Loader2 size={14} className="animate-spin" /> Uploading...
            </span>
          )}
          {draft.imageUrl && (
            <button
              type="button"
              onClick={handleClearImage("imageUrl")}
              className="text-xs font-medium text-rose-600 hover:text-rose-700"
            >
              Clear image
            </button>
          )}
        </div>
        {draft.imageUrl && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
            <img
              src={draft.imageUrl}
              alt="Hero slide primary preview"
              className="h-32 w-full object-cover"
            />
          </div>
        )}
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-600">Primary CTA</h3>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={draft.showPrimaryCta}
              onChange={handleChange("showPrimaryCta")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show primary button
          </label>
          <label className="space-y-1 text-sm">
            <span>Label</span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={draft.primaryCta?.label || ""}
              onChange={handleCtaChange("primaryCta", "label")}
              maxLength={60}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>URL</span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={draft.primaryCta?.href || ""}
              onChange={handleCtaChange("primaryCta", "href")}
              maxLength={200}
              placeholder="Optional"
            />
          </label>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-600">
            Secondary CTA
          </h3>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={draft.showSecondaryCta}
              onChange={handleChange("showSecondaryCta")}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Show secondary button
          </label>
          <label className="space-y-1 text-sm">
            <span>Label</span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={draft.secondaryCta?.label || ""}
              onChange={handleCtaChange("secondaryCta", "label")}
              maxLength={60}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>URL</span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={draft.secondaryCta?.href || ""}
              onChange={handleCtaChange("secondaryCta", "href")}
              maxLength={200}
              placeholder="Optional"
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-600">
          Product Reference
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Provide the product ID, slug, or URL to link this slide directly to a
          product detail page. The storefront will prefer these values over the
          auto-detected match.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span>Product ID</span>
            <input
              type="text"
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              value={draft.metadata?.productId || ""}
              onChange={handleMetadataChange("productId")}
              placeholder="Mongo ID"
              maxLength={48}
            />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={handleChange("isActive")}
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
        />
        Slide is active
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-400"
        >
          <Save size={18} />
          {isSaving ? "Saving..." : "Save Slide"}
        </button>
      </div>
    </div>
  );
};

const SlideCard = ({
  slide,
  onEdit,
  onDelete,
  isDeleting,
  dragHandleProps,
}) => {
  return (
    <motion.div
      layout
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div {...dragHandleProps} className="hidden cursor-grab md:block">
        <DragHandle />
      </div>
      <div className="relative h-20 w-32 overflow-hidden rounded-xl bg-slate-100">
        {slide.imageUrl ? (
          <img
            src={slide.imageUrl}
            alt={slide.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            <ImagePlus size={24} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-slate-900">
            {slide.title}
          </h3>
          {!slide.isActive && (
            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
              Inactive
            </span>
          )}
        </div>
        {slide.subtitle && (
          <p className="text-sm text-slate-500 line-clamp-2">
            {slide.subtitle}
          </p>
        )}
        <p className="text-xs text-slate-400">Priority: {slide.order ?? 0}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600"
        >
          <Edit size={16} /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="inline-flex items-center gap-1 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>
    </motion.div>
  );
};

const debounceMs = 300;

const AdminHeroCarouselPage = () => {
  const dispatch = useAppDispatch();
  const { user, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [draft, setDraft] = useState(emptySlide);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const clearPersistedDraft = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.draft) {
        setDraft({ ...emptySlide, ...parsed.draft });
        setEditingId(
          typeof parsed.editingId === "string" && parsed.editingId
            ? parsed.editingId
            : null
        );
        setIsFormOpen(true);
      }
    } catch (error) {
      console.error("Failed to restore hero slide draft", error);
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (!isFormOpen) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ draft, editingId })
      );
    } catch (error) {
      console.error("Failed to persist hero slide draft", error);
    }
  }, [draft, editingId, isFormOpen]);

  const { items, status, error, saving, deletingId, reorderStatus } =
    useAppSelector((state) => state.adminHeroCarousel);

  useEffect(() => {
    dispatch(fetchAdminHeroCarouselThunk());
  }, [dispatch]);

  const filteredSlides = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const query = searchTerm.trim().toLowerCase();
    return items.filter((slide) =>
      [slide.title, slide.subtitle, slide.overline]
        .filter(Boolean)
        .some((field) => field.toLowerCase().includes(query))
    );
  }, [items, searchTerm]);

  const startCreate = () => {
    setDraft({ ...emptySlide, order: items.length });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const startEdit = (slide) => {
    setDraft({
      ...emptySlide,
      ...slide,
      primaryCta: {
        label: slide.primaryCta?.label || "",
        href: slide.primaryCta?.href || "",
      },
      secondaryCta: {
        label: slide.secondaryCta?.label || "",
        href: slide.secondaryCta?.href || "",
      },
      metadata: {
        productId: getMetadataValue(slide.metadata, "productId"),
      },
      titleColor: slide.titleColor || "",
      overlineColor: slide.overlineColor || "",
      descriptionColor: slide.descriptionColor || "",
      showPrimaryCta:
        typeof slide.showPrimaryCta === "boolean" ? slide.showPrimaryCta : true,
      showSecondaryCta:
        typeof slide.showSecondaryCta === "boolean"
          ? slide.showSecondaryCta
          : true,
      showTitle: typeof slide.showTitle === "boolean" ? slide.showTitle : true,
      showOverline:
        typeof slide.showOverline === "boolean" ? slide.showOverline : true,
      showDescription:
        typeof slide.showDescription === "boolean"
          ? slide.showDescription
          : true,
    });
    setEditingId(slide._id);
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!draft.title.trim() || !draft.imageUrl.trim()) {
      toast.error("Title and Image URL are required");
      return;
    }

    const trimValue = (value) =>
      typeof value === "string" ? value.trim() : value;
    const sanitizeCta = (cta) => {
      if (!cta) return undefined;
      const label = trimValue(cta.label || "");
      const href = trimValue(cta.href || "");
      if (!label && !href) return undefined;
      return {
        ...(label ? { label } : {}),
        ...(href ? { href } : {}),
      };
    };

    const sanitizeMetadata = (metadata) => {
      const productId = trimValue(metadata?.productId || "");
      return productId ? { productId } : undefined;
    };

    const payload = {
      title: trimValue(draft.title),
      description: trimValue(draft.description),
      overline: trimValue(draft.overline),
      imageUrl: trimValue(draft.imageUrl),
      titleColor: trimValue(draft.titleColor) || undefined,
      overlineColor: trimValue(draft.overlineColor) || undefined,
      descriptionColor: trimValue(draft.descriptionColor) || undefined,
      primaryCta: sanitizeCta(draft.primaryCta),
      secondaryCta: sanitizeCta(draft.secondaryCta),
      metadata: sanitizeMetadata(draft.metadata),
      showPrimaryCta: Boolean(draft.showPrimaryCta),
      showSecondaryCta: Boolean(draft.showSecondaryCta),
      showTitle: Boolean(draft.showTitle),
      showOverline: Boolean(draft.showOverline),
      showDescription: Boolean(draft.showDescription),
      isActive: draft.isActive,
      order: Number(draft.order) || 0,
    };

    try {
      if (editingId) {
        await dispatch(
          updateAdminHeroCarouselThunk({ id: editingId, payload })
        ).unwrap();
        toast.success("Slide updated");
      } else {
        await dispatch(createAdminHeroCarouselThunk(payload)).unwrap();
        toast.success("Slide created");
      }
      clearPersistedDraft();
      setIsFormOpen(false);
      setEditingId(null);
      setDraft(emptySlide);
    } catch (saveError) {
      toast.error(saveError.message || "Failed to save slide");
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Delete this slide? This action cannot be undone"
    );
    if (!confirmed) return;

    try {
      await dispatch(deleteAdminHeroCarouselThunk(id)).unwrap();
      toast.success("Slide deleted");
    } catch (deleteError) {
      toast.error(deleteError.message || "Failed to delete slide");
    }
  };

  const [pendingOrder, setPendingOrder] = useState([]);

  const debouncedReorder = useMemo(
    () =>
      debounce((orderedIds) => {
        dispatch(reorderAdminHeroCarouselThunk(orderedIds))
          .unwrap()
          .catch((error) => {
            toast.error(error.message || "Failed to reorder slides");
          });
      }, debounceMs),
    [dispatch]
  );

  useEffect(() => {
    return () => {
      debouncedReorder.cancel();
    };
  }, [debouncedReorder]);

  const handleDragStart = (index) => {
    setPendingOrder(filteredSlides.map((slide) => slide._id));
    setDraggingIndex(index);
  };

  const [draggingIndex, setDraggingIndex] = useState(null);

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (targetIndex) => {
    if (draggingIndex === null || draggingIndex === targetIndex) {
      setDraggingIndex(null);
      return;
    }

    const currentOrder = [...filteredSlides];
    const [moved] = currentOrder.splice(draggingIndex, 1);
    currentOrder.splice(targetIndex, 0, moved);

    const orderedIds = currentOrder.map((slide, index) => ({
      ...slide,
      order: index,
    }));

    const ids = orderedIds.map((slide) => slide._id);
    setPendingOrder(ids);
    debouncedReorder(ids);
    setDraggingIndex(null);
  };

  const isLoading = status === "loading";
  const isEmpty = !isLoading && filteredSlides.length === 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="flex md:h-screen">
        <Sidebar
          active="Hero Carousel"
          className="hidden md:flex md:w-64"
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
                  active="Hero Carousel"
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
            showRangeSelector={false}
            showNotifications={false}
            onLogout={logout}
          />

          <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 space-y-6">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <h1 className="text-2xl font-semibold text-slate-900">
                  Hero Carousel
                </h1>
                <p className="text-sm text-slate-500">
                  Manage hero slides, copy, and call-to-actions displayed on the
                  storefront home page.
                </p>
              </div>
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500"
              >
                <Plus size={18} /> New Slide
              </button>
            </header>

            <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search slides"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {searchTerm && (
                      <button
                        type="button"
                        onClick={() => setSearchTerm("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {filteredSlides.length} slide
                    {filteredSlides.length === 1 ? "" : "s"}
                  </span>
                </div>
                {reorderStatus === "loading" && (
                  <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 size={14} className="animate-spin" /> Saving
                    order...
                  </span>
                )}
              </div>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-16 text-slate-400">
                  <Loader2 size={32} className="animate-spin" />
                  <p className="mt-3 text-sm">Loading hero slides...</p>
                </div>
              ) : isEmpty ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 py-16 text-center">
                  <div className="rounded-full bg-blue-50 p-3 text-blue-500">
                    <ImagePlus size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-600">
                      No slides yet
                    </p>
                    <p className="text-sm text-slate-500">
                      Create your first slide to welcome customers with custom
                      copy and visuals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startCreate}
                    className="inline-flex items-center gap-2 rounded-full border border-blue-200 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
                  >
                    <Plus size={16} /> Create slide
                  </button>
                </div>
              ) : (
                <motion.div layout className="space-y-3">
                  {filteredSlides.map((slide, index) => (
                    <div
                      key={slide._id}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                    >
                      <SlideCard
                        slide={slide}
                        onEdit={() => startEdit(slide)}
                        onDelete={() => handleDelete(slide._id)}
                        isDeleting={deletingId === slide._id}
                        dragHandleProps={{}}
                      />
                    </div>
                  ))}
                </motion.div>
              )}

              {error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                  {error}
                </div>
              )}
            </div>

            <AnimatePresence>
              {isFormOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
                >
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {editingId ? "Edit Slide" : "Create Slide"}
                      </h2>
                      <p className="text-sm text-slate-500">
                        {editingId
                          ? "Update content, CTAs and imagery for this hero position."
                          : "Add a new card to the hero carousel with imagery and calls to action."}
                      </p>
                    </div>
                  </div>
                  <SlideForm
                    draft={draft}
                    onChange={setDraft}
                    onSave={handleSave}
                    onCancel={() => {
                      clearPersistedDraft();
                      setIsFormOpen(false);
                      setEditingId(null);
                      setDraft(emptySlide);
                    }}
                    isSaving={saving}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminHeroCarouselPage;
