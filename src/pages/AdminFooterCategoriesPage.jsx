import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUp, Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchFooterCategories,
  fetchAvailableFooterCategories,
  createFooterCategory,
  updateFooterCategory,
  deleteFooterCategory,
  reorderFooterCategories,
} from "../services/footerCategoryApi";

const HEADER_HEIGHT = 72;

const buildSlug = (value = "") =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

const AdminFooterCategoriesPage = () => {
  const { user, logout } = useAuth();
  const [categories, setCategories] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [reorderLoading, setReorderLoading] = useState(false);
  const [drafts, setDrafts] = useState({});
  const [newCategory, setNewCategory] = useState({
    name: "",
    slug: "",
    isVisible: true,
    priority: 0,
  });

  const assignedSlugs = useMemo(
    () => new Set(categories.map((category) => category.slug)),
    [categories]
  );

  const selectableCategories = useMemo(() => {
    if (!availableCategories.length) return [];
    return availableCategories.filter(
      (item) => item.slug && !assignedSlugs.has(item.slug)
    );
  }, [availableCategories, assignedSlugs]);

  const loadCategories = async (showLoader = true) => {
    if (showLoader) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    try {
      const response = await fetchFooterCategories();
      const data = Array.isArray(response.data) ? response.data : [];
      setCategories(data);
      setDrafts({});
    } catch (error) {
      console.error("Failed to load footer categories", error);
      toast.error(error.message || "Failed to load footer categories");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadAvailableCategories = async () => {
    try {
      const response = await fetchAvailableFooterCategories();
      setAvailableCategories(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Failed to load available categories", error);
      toast.error(error.message || "Failed to load available categories");
    }
  };

  useEffect(() => {
    loadCategories();
    loadAvailableCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setNewCategory((prev) => {
      if (prev.name) {
        return prev;
      }
      const firstAvailable = selectableCategories[0];
      if (!firstAvailable) {
        return prev;
      }
      return {
        ...prev,
        name: firstAvailable.name,
        slug: firstAvailable.slug,
      };
    });
  }, [selectableCategories]);

  const handleDraftChange = (id, changes) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        ...changes,
      },
    }));
  };

  const getDraftFor = (category) => {
    const draft = drafts[category._id];
    if (!draft) {
      return {
        priority: category.priority ?? 0,
        isVisible: category.isVisible !== false,
        slug: category.slug || "",
      };
    }
    return {
      priority:
        draft.priority !== undefined ? draft.priority : category.priority ?? 0,
      isVisible:
        draft.isVisible !== undefined
          ? draft.isVisible
          : category.isVisible !== false,
      slug: draft.slug !== undefined ? draft.slug : category.slug || "",
    };
  };

  const draftHasChanges = (category) => {
    const draft = drafts[category._id];
    if (!draft) return false;
    const normalized = getDraftFor(category);
    return (
      normalized.priority !== (category.priority ?? 0) ||
      normalized.isVisible !== (category.isVisible !== false) ||
      normalized.slug !== (category.slug || "")
    );
  };

  const resetDraft = (id) => {
    setDrafts((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleCreateCategory = async (event) => {
    event.preventDefault();
    if (!newCategory.name) {
      toast.error("Select a category to add");
      return;
    }

    const payload = {
      name: newCategory.name,
      slug: newCategory.slug || buildSlug(newCategory.name),
      isVisible: Boolean(newCategory.isVisible),
      priority: Number.isFinite(Number(newCategory.priority))
        ? Number(newCategory.priority)
        : 0,
    };

    setIsCreating(true);
    try {
      const response = await createFooterCategory(payload);
      const created = response.data || response;
      toast.success("Footer category added");
      setCategories((prev) =>
        [...prev, created].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      );
      setNewCategory({ name: "", slug: "", isVisible: true, priority: 0 });
      await loadAvailableCategories();
    } catch (error) {
      console.error("Failed to create footer category", error);
      toast.error(error.message || "Failed to create footer category");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveCategory = async (category) => {
    const draft = getDraftFor(category);
    try {
      const response = await updateFooterCategory(category._id, {
        slug: draft.slug,
        isVisible: draft.isVisible,
        priority: draft.priority,
      });
      const updated = response.data || response;
      toast.success("Category updated");
      setCategories((prev) =>
        prev
          .map((item) => (item._id === updated._id ? updated : item))
          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
      );
      resetDraft(category._id);
    } catch (error) {
      console.error("Failed to update footer category", error);
      toast.error(error.message || "Failed to update category");
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm("Remove this category from the footer?")) {
      return;
    }
    try {
      await deleteFooterCategory(categoryId);
      toast.success("Category removed");
      setCategories((prev) => prev.filter((item) => item._id !== categoryId));
      await loadAvailableCategories();
    } catch (error) {
      console.error("Failed to delete footer category", error);
      toast.error(error.message || "Failed to delete category");
    }
  };

  const handleReorder = async (categoryId, direction) => {
    const index = categories.findIndex(
      (category) => category._id === categoryId
    );
    if (index < 0) return;

    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= categories.length) {
      return;
    }

    const reordered = [...categories];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(swapWith, 0, moved);

    setReorderLoading(true);
    try {
      const response = await reorderFooterCategories(
        reordered.map((category) => category._id)
      );
      const updated = Array.isArray(response.data) ? response.data : reordered;
      setCategories(updated);
      toast.success("Category order updated");
    } catch (error) {
      console.error("Failed to reorder categories", error);
      toast.error(error.message || "Failed to reorder categories");
    } finally {
      setReorderLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          active="Footer Categories"
          className="hidden lg:flex lg:w-64 lg:flex-none"
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 flex lg:hidden"
            >
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 220, damping: 24 }}
                className="bg-white w-72 max-w-sm h-full shadow-xl"
              >
                <Sidebar
                  active="Footer Categories"
                  className="flex w-full"
                  onNavigate={() => setIsSidebarOpen(false)}
                />
              </motion.div>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="flex-1 bg-black/30"
                aria-label="Close navigation"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            adminName={user?.name || user?.username || "Admin"}
            adminRole={user?.role === "admin" ? "Administrator" : user?.role}
            onLogout={logout}
            activeRange="All Date"
            onSelectRange={() => {}}
            showRangeSelector={false}
            showNotifications={false}
          />

          <main
            className="flex-1 overflow-y-auto"
            style={{ maxHeight: `calc(100vh - ${HEADER_HEIGHT}px)` }}
          >
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">
                    Footer Categories
                  </h1>
                  <p className="text-sm text-slate-500">
                    Control which categories appear in the storefront footer and
                    set their display priority.
                  </p>
                </div>
                <button
                  onClick={() => loadCategories(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:border-blue-200 hover:text-blue-600 transition"
                  disabled={isRefreshing}
                >
                  {isRefreshing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : null}
                  Refresh
                </button>
              </header>

              <section className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                <div className="px-5 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Active Categories
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      Reorder to change priority. Lower numbers appear first in
                      the footer.
                    </p>
                  </div>
                  {(isLoading || reorderLoading) && (
                    <Loader2
                      size={18}
                      className="animate-spin text-slate-400"
                    />
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Slug</th>
                        <th className="px-6 py-3 text-center">Priority</th>
                        <th className="px-6 py-3 text-center">Visible</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {isLoading ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            <div className="inline-flex items-center gap-3">
                              <Loader2 size={20} className="animate-spin" />
                              Loading categories…
                            </div>
                          </td>
                        </tr>
                      ) : categories.length ? (
                        categories.map((category, index) => {
                          const draft = getDraftFor(category);
                          const hasChanges = draftHasChanges(category);
                          const disableMoveUp = index === 0 || reorderLoading;
                          const disableMoveDown =
                            index === categories.length - 1 || reorderLoading;

                          return (
                            <tr
                              key={category._id}
                              className="hover:bg-slate-50/60 transition"
                            >
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-800">
                                  {category.name}
                                </div>
                                <div className="text-xs text-slate-400">
                                  Created{" "}
                                  {new Date(
                                    category.createdAt
                                  ).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  type="text"
                                  value={draft.slug}
                                  onChange={(event) =>
                                    handleDraftChange(category._id, {
                                      slug: buildSlug(event.target.value),
                                    })
                                  }
                                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                                  placeholder="category-slug"
                                />
                              </td>
                              <td className="px-6 py-4 text-center">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.priority}
                                  onChange={(event) =>
                                    handleDraftChange(category._id, {
                                      priority: Number(event.target.value),
                                    })
                                  }
                                  className="w-24 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 mx-auto"
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-center">
                                  <label className="inline-flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={draft.isVisible}
                                      onChange={(event) =>
                                        handleDraftChange(category._id, {
                                          isVisible: event.target.checked,
                                        })
                                      }
                                      className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                                    />
                                    <span className="text-xs text-slate-500">
                                      {draft.isVisible ? "Shown" : "Hidden"}
                                    </span>
                                  </label>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReorder(category._id, "up")
                                    }
                                    disabled={disableMoveUp}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Move up"
                                  >
                                    <ArrowUp size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleReorder(category._id, "down")
                                    }
                                    disabled={disableMoveDown}
                                    className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                    aria-label="Move down"
                                  >
                                    <ArrowDown size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteCategory(category._id)
                                    }
                                    className="p-2 rounded-lg border border-rose-100 text-rose-500 hover:bg-rose-50"
                                    aria-label="Delete category"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSaveCategory(category)}
                                    disabled={!hasChanges}
                                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-40"
                                  >
                                    <Save size={14} /> Save
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-6 py-10 text-center text-slate-500"
                          >
                            No footer categories configured yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
                <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                      Add category to footer
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Pick a product category and configure its footer
                      visibility.
                    </p>
                  </div>
                </header>

                <form
                  onSubmit={handleCreateCategory}
                  className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
                >
                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Category
                    </span>
                    <select
                      value={newCategory.name}
                      onChange={(event) => {
                        const selected = selectableCategories.find(
                          (item) => item.name === event.target.value
                        );
                        setNewCategory((prev) => ({
                          ...prev,
                          name: selected?.name || "",
                          slug: selected?.slug || buildSlug(event.target.value),
                        }));
                      }}
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="" disabled>
                        {selectableCategories.length
                          ? "Select category"
                          : "No categories available"}
                      </option>
                      {selectableCategories.map((category) => (
                        <option key={category.slug} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Slug
                    </span>
                    <input
                      type="text"
                      value={newCategory.slug}
                      onChange={(event) =>
                        setNewCategory((prev) => ({
                          ...prev,
                          slug: buildSlug(event.target.value),
                        }))
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="category-slug"
                    />
                    <span className="text-[11px] text-slate-400">
                      Used for footer links. Lowercase alphanumeric and hyphen
                      only.
                    </span>
                  </label>

                  <label className="flex flex-col gap-2">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Priority
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={newCategory.priority}
                      onChange={(event) =>
                        setNewCategory((prev) => ({
                          ...prev,
                          priority: Number(event.target.value),
                        }))
                      }
                      className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                    <span className="text-[11px] text-slate-400">
                      Lower numbers display earlier. Defaults to 0.
                    </span>
                  </label>

                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={newCategory.isVisible}
                      onChange={(event) =>
                        setNewCategory((prev) => ({
                          ...prev,
                          isVisible: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                    />
                    <span className="text-sm text-slate-600">
                      Show in footer
                    </span>
                  </label>

                  <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      disabled={isCreating || !newCategory.name}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreating ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <Plus size={16} />
                      )}
                      {isCreating ? "Adding" : "Add Category"}
                    </button>
                  </div>
                </form>
              </section>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminFooterCategoriesPage;
