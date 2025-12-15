import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  PencilLine,
  Eye,
  Trash2,
  X,
  FileDown,
  Info,
  Search,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-toastify";

const normalizeRole = (role) => {
  const value = String(role || "")
    .trim()
    .toLowerCase();
  if (["admin", "seller", "customer"].includes(value)) {
    return value;
  }
  return "customer";
};

const ROLE_DISPLAY = {
  admin: {
    label: "Admin",
    badgeClass: "bg-blue-100 text-blue-600",
  },
  seller: {
    label: "Seller",
    badgeClass: "bg-purple-100 text-purple-600",
  },
  customer: {
    label: "Customer",
    badgeClass: "bg-slate-100 text-slate-500",
  },
};

const AdminUsersTable = ({
  users,
  isLoading,
  error,
  onUserUpdated,
  enableManagement,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formState, setFormState] = useState({
    name: "",
    username: "",
    email: "",
    role: "customer",
    isVerified: false,
  });
  const [viewUser, setViewUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userPendingDelete, setUserPendingDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isBulkViewOpen, setIsBulkViewOpen] = useState(false);

  useEffect(() => {
    if (!enableManagement) {
      setSelectedIds([]);
      return;
    }

    setSelectedIds((prev) =>
      prev.filter((id) => users.some((usr) => usr._id === id))
    );
  }, [enableManagement, users]);

  useEffect(() => {
    if (!selectedIds.length) {
      setIsBulkViewOpen(false);
    }
  }, [selectedIds]);

  const openDrawer = (user) => {
    setSelectedUser(user);
    setFormState({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      role: normalizeRole(user.role),
      isVerified: Boolean(user.isVerified),
    });
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (isSaving) return;
    setIsDrawerOpen(false);
    setSelectedUser(null);
  };

  const openViewModal = (user) => {
    setViewUser(user);
  };

  const closeViewModal = () => setViewUser(null);

  const openDeleteConfirm = (user) => {
    setUserPendingDelete(user);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) return;
    setUserPendingDelete(null);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormState((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedUser) return;

    const trimmedUsername = formState.username.trim();
    if (!trimmedUsername) {
      toast.error("Username is required");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        username: trimmedUsername,
        role: formState.role,
        isVerified: formState.isVerified,
      };

      const { data } = await api.put(
        `/admin/users/${selectedUser._id}`,
        payload
      );
      toast.success("Team member updated");
      setIsSaving(false);
      setIsDrawerOpen(false);
      setSelectedUser(null);
      onUserUpdated?.(data.data);
    } catch (err) {
      console.error("Failed to update member", err);
      const message =
        err.response?.data?.message ||
        "Unable to update team member. Please try again.";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const sortedUsers = useMemo(
    () =>
      [...users]
        .map((user) => ({
          ...user,
          role: normalizeRole(user.role),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return sortedUsers.filter((usr) => {
      const matchesQuery = query
        ? [usr.name, usr.username, usr.email]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(query))
        : true;

      const matchesRole =
        roleFilter === "all" ? true : normalizeRole(usr.role) === roleFilter;

      const matchesStatus =
        statusFilter === "all"
          ? true
          : statusFilter === "verified"
          ? Boolean(usr.isVerified)
          : !usr.isVerified;

      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [sortedUsers, searchTerm, roleFilter, statusFilter]);

  const handleDownloadCsv = () => {
    if (!sortedUsers.length) {
      toast.info("No team members to export");
      return;
    }

    const header = ["Name", "Username", "Email", "Role", "Verified", "Joined"];
    const rows = sortedUsers.map((usr) => [
      (usr.name || "").replace(/\n|\r|"/g, " "),
      (usr.username || "").replace(/\n|\r|"/g, " "),
      usr.email,
      ROLE_DISPLAY[normalizeRole(usr.role)].label,
      usr.isVerified ? "Yes" : "No",
      new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(usr.createdAt)),
    ]);

    const csvContent = [header, ...rows]
      .map((columns) =>
        columns
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `team-members-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!userPendingDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/users/${userPendingDelete._id}`);
      toast.success("Team member deleted");
      onUserUpdated?.({ _id: userPendingDelete._id, __delete: true });
      setIsDeleting(false);
      setUserPendingDelete(null);
    } catch (err) {
      console.error("Failed to delete member", err);
      const message =
        err.response?.data?.message ||
        "Unable to delete team member. Please try again.";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  const handleToggleAll = () => {
    if (!enableManagement) return;
    const ids = filteredUsers.map((usr) => usr._id);
    const hasUnselected = ids.some((id) => !selectedIds.includes(id));
    setSelectedIds(hasUnselected ? ids : []);
  };

  const handleToggleRow = (userId) => {
    if (!enableManagement) return;
    setSelectedIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      toast.info("Select at least one user to delete");
      return;
    }

    setIsBulkDeleting(true);
    try {
      const { data } = await api.post("/admin/users/bulk-delete", {
        ids: selectedIds,
      });

      const deletedIds = data?.deletedIds || [];
      const skippedIds = data?.skippedIds || [];

      if (deletedIds.length) {
        toast.success(
          `Deleted ${deletedIds.length} user${deletedIds.length > 1 ? "s" : ""}`
        );
        onUserUpdated?.({ __bulkDelete: true, deletedIds });
      }

      if (skippedIds.length) {
        toast.warn(
          `Skipped ${skippedIds.length} user${skippedIds.length > 1 ? "s" : ""}`
        );
      }

      setSelectedIds([]);
      setIsSelectionModalOpen(false);
    } catch (err) {
      console.error("Failed to bulk delete", err);
      const message =
        err.response?.data?.message || "Unable to delete selected users.";
      toast.error(message);
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const selectedUsersDetails = useMemo(
    () => filteredUsers.filter((usr) => selectedIds.includes(usr._id)),
    [filteredUsers, selectedIds]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm"
    >
      <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-slate-900">Customers</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search name, email, username"
              className="w-48 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-blue-400"
          >
            <option value="all">All roles</option>
            <option value="customer">Customers</option>
            <option value="seller">Sellers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:outline-none focus:border-blue-400"
          >
            <option value="all">All status</option>
            <option value="verified">Verified</option>
            <option value="unverified">Pending</option>
          </select>
          <button
            type="button"
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-blue-200 hover:text-blue-600 transition"
          >
            <FileDown size={18} /> Export CSV
          </button>
          {enableManagement && (
            <>
              <button
                type="button"
                onClick={() => setIsBulkViewOpen(true)}
                disabled={selectedIds.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-blue-200 hover:text-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                <Eye size={16} /> Bulk View
              </button>
              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(true)}
                disabled={selectedIds.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-500 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
              >
                <Trash2 size={16} /> Bulk Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
              {enableManagement && (
                <th className="px-6 py-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length > 0 &&
                        filteredUsers.every((usr) =>
                          selectedIds.includes(usr._id)
                        )
                      }
                      onChange={handleToggleAll}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td
                  colSpan={enableManagement ? 7 : 6}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  Loading team members...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={enableManagement ? 7 : 6}
                  className="px-6 py-12 text-center text-red-400"
                >
                  {error}
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td
                  colSpan={enableManagement ? 7 : 6}
                  className="px-6 py-12 text-center text-slate-400"
                >
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((usr) => (
                <tr key={usr._id} className="hover:bg-slate-50/60 transition">
                  {enableManagement && (
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(usr._id)}
                        onChange={() => handleToggleRow(usr._id)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white grid place-items-center font-semibold">
                        {(usr.name || usr.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {usr.name || usr.username}
                        </p>
                        <p className="text-xs text-slate-400">{usr.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                    {usr.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const normalized = normalizeRole(usr.role);
                      const { label, badgeClass } =
                        ROLE_DISPLAY[normalized] || ROLE_DISPLAY.customer;
                      return (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                        >
                          {label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {usr.isVerified ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                        <ShieldCheck size={14} /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-500">
                        <ShieldAlert size={14} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-slate-500">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                    }).format(new Date(usr.createdAt))}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openViewModal(usr)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-blue-200 hover:text-blue-600 transition"
                      >
                        <Eye size={14} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => openDrawer(usr)}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-blue-200 hover:text-blue-600 transition"
                      >
                        <PencilLine size={14} /> Edit
                      </button>
                      {enableManagement && (
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(usr)}
                          className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:border-red-300 hover:text-red-600 transition"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 px-4 md:hidden">
        {enableManagement && filteredUsers.length > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Selection
              </p>
              <p className="text-sm font-medium text-slate-700">
                {selectedIds.length} selected
              </p>
            </div>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <input
                type="checkbox"
                checked={
                  filteredUsers.length > 0 &&
                  filteredUsers.every((usr) => selectedIds.includes(usr._id))
                }
                onChange={handleToggleAll}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Select all
            </label>
          </div>
        )}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              Loading team members...
            </motion.div>
          )}

          {!isLoading && error && (
            <motion.div
              className="rounded-2xl border border-rose-200 bg-white p-6 text-center text-rose-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {error}
            </motion.div>
          )}

          {!isLoading && !error && filteredUsers.length === 0 && (
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No users found.
            </motion.div>
          )}

          {!isLoading &&
            !error &&
            filteredUsers.map((usr) => {
              const isSelected = selectedIds.includes(usr._id);
              return (
                <motion.div
                  key={usr._id}
                  className={`relative rounded-2xl border bg-white p-4 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-100 ${
                    enableManagement && isSelected
                      ? "border-blue-300 ring-2 ring-blue-100"
                      : "border-slate-200"
                  }`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                >
                  {enableManagement && (
                    <div className="absolute -top-2 -left-2">
                      <label className="flex items-center gap-2 rounded-full bg-white/80 px-2 py-1 shadow-sm">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(usr._id)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-[11px] font-medium text-slate-600">
                          Select
                        </span>
                      </label>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white grid place-items-center font-semibold">
                      {(usr.name || usr.username || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {usr.name || usr.username}
                          </p>
                          <p className="text-xs text-slate-500">{usr.email}</p>
                          <p className="text-xs text-slate-400">
                            {usr.username}
                          </p>
                        </div>
                        {(() => {
                          const normalized = normalizeRole(usr.role);
                          const { label, badgeClass } =
                            ROLE_DISPLAY[normalized] || ROLE_DISPLAY.customer;
                          return (
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                            >
                              {label}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Status
                          </p>
                          {usr.isVerified ? (
                            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                              <ShieldCheck size={12} /> Verified
                            </span>
                          ) : (
                            <span className="mt-1 inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-500">
                              <ShieldAlert size={12} /> Pending
                            </span>
                          )}
                        </div>
                        <div className="rounded-xl bg-slate-50 p-3">
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Joined
                          </p>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                            }).format(new Date(usr.createdAt))}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openViewModal(usr)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          type="button"
                          onClick={() => openDrawer(usr)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-blue-200 hover:text-blue-600"
                        >
                          <PencilLine size={14} /> Edit
                        </button>
                        {enableManagement && (
                          <button
                            type="button"
                            onClick={() => openDeleteConfirm(usr)}
                            className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:border-rose-300"
                          >
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {viewUser && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={closeViewModal}
              aria-label="Close view modal"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="relative z-10 w-full max-w-lg rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Team Member Details
                  </h2>
                  <p className="text-sm text-slate-500">
                    Quick snapshot of account information.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeViewModal}
                  className="rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="px-6 py-6 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Name
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewUser.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Username
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewUser.username || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Email
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewUser.email}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {(() => {
                    const normalized = normalizeRole(viewUser.role);
                    const { label, badgeClass } =
                      ROLE_DISPLAY[normalized] || ROLE_DISPLAY.customer;
                    return (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${badgeClass}`}
                      >
                        {label}
                      </span>
                    );
                  })()}
                  {viewUser.isVerified ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                      <ShieldCheck size={14} /> Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-500">
                      <ShieldAlert size={14} /> Pending Verification
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Joined
                  </p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(viewUser.createdAt))}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">
                    Addresses
                  </p>
                  {!viewUser.addresses?.length && (
                    <p className="text-sm font-medium text-slate-500">
                      No saved addresses
                    </p>
                  )}
                  {viewUser.addresses?.map((address) => (
                    <div
                      key={address._id}
                      className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                    >
                      <p className="font-semibold text-slate-900">
                        {address.fullName}
                        {address.isDefault ? (
                          <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-600">
                            Default
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-slate-500">
                        {address.mobile}
                        {address.alternatePhone
                          ? ` · Alt: ${address.alternatePhone}`
                          : ""}
                      </p>
                      <p className="mt-1 leading-relaxed">
                        {address.addressLine}, {address.city}, {address.state} -{" "}
                        {address.pincode}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {address.email}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isSelectionModalOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => {
                if (isBulkDeleting) return;
                setIsSelectionModalOpen(false);
              }}
              aria-label="Close selection overview"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="relative z-10 w-full max-w-3xl rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Selected users ({selectedIds.length})
                  </h2>
                  <p className="text-sm text-slate-500 flex items-center gap-2">
                    <Info size={16} className="text-blue-500" /> Review the list
                    before deleting accounts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isBulkDeleting) return;
                    setIsSelectionModalOpen(false);
                  }}
                  className="rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 p-1"
                  aria-label="Close"
                  disabled={isBulkDeleting}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
                {!selectedUsersDetails.length ? (
                  <p className="text-sm text-slate-500">
                    No users selected or some accounts are no longer available.
                  </p>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Email</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                      {selectedUsersDetails.map((usr) => (
                        <tr key={usr._id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-slate-900">
                              {usr.name || usr.username}
                            </p>
                            <p className="text-xs text-slate-400">
                              {usr.username}
                            </p>
                          </td>
                          <td className="px-4 py-3">{usr.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                                usr.role === "admin"
                                  ? "bg-blue-100 text-blue-600"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {usr.role === "admin" ? "Admin" : "Customer"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {usr.isVerified ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-600">
                                <ShieldCheck size={12} /> Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-500">
                                <ShieldAlert size={12} /> Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (isBulkDeleting) return;
                    setIsSelectionModalOpen(false);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
                  disabled={isBulkDeleting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
                  disabled={isBulkDeleting || !selectedUsersDetails.length}
                >
                  {isBulkDeleting ? "Deleting..." : "Delete Selected"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isDrawerOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="flex-1 bg-black/40"
              onClick={closeDrawer}
              aria-label="Close edit panel"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 200, damping: 26 }}
              className="w-full max-w-md bg-white h-full overflow-y-auto shadow-xl"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Edit Team Member
                  </h2>
                  <p className="text-sm text-slate-500">
                    Update profile details and access for this account.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  className="rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>

              <form className="px-6 py-6 space-y-5" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="name"
                  >
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formState.name}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
                    placeholder="e.g. Priya Sharma"
                    aria-readonly="true"
                  />
                  <p className="text-xs text-slate-400">
                    Name changes must be requested by the user.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="username"
                  >
                    Username
                  </label>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={formState.username}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. priyash"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="email"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formState.email}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none"
                    placeholder="e.g. priya@example.com"
                    required
                    aria-readonly="true"
                  />
                  <p className="text-xs text-slate-400">
                    Email cannot be modified by admin.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-sm font-medium text-slate-600"
                    htmlFor="role"
                  >
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formState.role}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 focus:border-blue-400 focus:outline-none"
                  >
                    <option value="customer">Customer</option>
                    <option value="seller">Seller</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    name="isVerified"
                    checked={formState.isVerified}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  Mark email as verified
                </label>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={closeDrawer}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}

        {userPendingDelete && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={closeDeleteConfirm}
              aria-label="Dismiss delete confirmation"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="relative z-10 w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="px-6 py-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Delete Team Member
                  </h3>
                  <p className="text-sm text-slate-500">
                    This will permanently remove{" "}
                    {userPendingDelete.name || userPendingDelete.username}
                    's account access.
                  </p>
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeDeleteConfirm}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:text-slate-700 hover:border-slate-300 transition"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {isBulkViewOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setIsBulkViewOpen(false)}
              aria-label="Close bulk view"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 24 }}
              className="relative z-10 w-full max-w-4xl rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Selected customers ({selectedUsersDetails.length})
                  </h2>
                  <p className="text-sm text-slate-500">
                    Review key details before performing a bulk action.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkViewOpen(false)}
                  className="rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300 p-1"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="max-h-[65vh] overflow-y-auto px-6 py-5 space-y-4">
                {!selectedUsersDetails.length ? (
                  <p className="text-sm text-slate-500">
                    No customers selected.
                  </p>
                ) : (
                  selectedUsersDetails.map((usr) => (
                    <div
                      key={usr._id}
                      className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-4"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {usr.name || usr.username || "Unnamed"}
                          </p>
                          <p className="text-xs text-slate-500">{usr.email}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              usr.role === "admin"
                                ? "bg-blue-100 text-blue-600"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {usr.role === "admin" ? "Admin" : "Customer"}
                          </span>
                          {usr.isVerified ? (
                            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-600">
                              <ShieldCheck size={14} /> Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-500">
                              <ShieldAlert size={14} /> Pending
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Username
                          </p>
                          <p className="mt-1 font-medium text-slate-700">
                            {usr.username || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Joined
                          </p>
                          <p className="mt-1 font-medium text-slate-700">
                            {new Intl.DateTimeFormat("en-IN", {
                              dateStyle: "medium",
                            }).format(new Date(usr.createdAt))}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-slate-400">
                            Addresses saved
                          </p>
                          <p className="mt-1 font-medium text-slate-700">
                            {Array.isArray(usr.addresses)
                              ? usr.addresses.length
                              : 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

AdminUsersTable.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      _id: PropTypes.string.isRequired,
      name: PropTypes.string,
      username: PropTypes.string,
      email: PropTypes.string.isRequired,
      role: PropTypes.string,
      isVerified: PropTypes.bool,
      createdAt: PropTypes.string,
      addresses: PropTypes.arrayOf(
        PropTypes.shape({
          _id: PropTypes.string,
          fullName: PropTypes.string,
          mobile: PropTypes.string,
          email: PropTypes.string,
          pincode: PropTypes.string,
          state: PropTypes.string,
          city: PropTypes.string,
          addressLine: PropTypes.string,
          alternatePhone: PropTypes.string,
          isDefault: PropTypes.bool,
        })
      ),
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onUserUpdated: PropTypes.func,
  enableManagement: PropTypes.bool,
};

AdminUsersTable.defaultProps = {
  users: [],
  isLoading: false,
  error: "",
  onUserUpdated: undefined,
  enableManagement: false,
};

export default AdminUsersTable;
