import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  PencilLine,
  Eye,
  Trash2,
  X,
  FileDown,
} from "lucide-react";
import api from "../../utils/api";
import { toast } from "react-toastify";

const AdminUsersTable = ({ users, isLoading, error, onUserUpdated }) => {
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

  const openDrawer = (user) => {
    setSelectedUser(user);
    setFormState({
      name: user.name || "",
      username: user.username || "",
      email: user.email || "",
      role: user.role || "customer",
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

    setIsSaving(true);
    try {
      const { data } = await api.put(`/admin/users/${selectedUser._id}`, formState);
      toast.success("Team member updated");
      setIsSaving(false);
      setIsDrawerOpen(false);
      setSelectedUser(null);
      onUserUpdated?.(data.data);
    } catch (err) {
      console.error("Failed to update member", err);
      const message =
        err.response?.data?.message || "Unable to update team member. Please try again.";
      toast.error(message);
      setIsSaving(false);
    }
  };

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [users]
  );

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
      usr.role,
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
        err.response?.data?.message || "Unable to delete team member. Please try again.";
      toast.error(message);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.15 }}
      className="bg-white border border-slate-100 rounded-2xl shadow-sm"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Team Members</h3>
          <p className="text-sm text-slate-400 mt-1">
            Manage roles, verification status, and account details for your team.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:border-blue-200 hover:text-blue-600 transition"
        >
          <FileDown size={18} /> Download CSV
        </button>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100">
          <thead className="bg-slate-50/80">
            <tr>
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
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                  Loading team members...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-red-400">
                  {error}
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              sortedUsers.map((usr) => (
                <tr key={usr._id} className="hover:bg-slate-50/60 transition">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white grid place-items-center font-semibold">
                        {(usr.name || usr.username || "U").charAt(0).toUpperCase()}
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
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                        usr.role === "admin"
                          ? "bg-blue-100 text-blue-600"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {usr.role === "admin" ? "Admin" : "Customer"}
                    </span>
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
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(usr)}
                        className="inline-flex items-center gap-2 rounded-full border border-red-200 px-3 py-1 text-xs font-medium text-red-500 hover:border-red-300 hover:text-red-600 transition"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 px-4 md:hidden">
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

          {!isLoading && !error && users.length === 0 && (
            <motion.div
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              No users found.
            </motion.div>
          )}

          {!isLoading && !error &&
            sortedUsers.map((usr) => (
              <motion.div
                key={usr._id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white grid place-items-center font-semibold">
                    {(usr.name || usr.username || "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {usr.name || usr.username}
                        </p>
                        <p className="text-xs text-slate-500">{usr.email}</p>
                        <p className="text-xs text-slate-400">{usr.username}</p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          usr.role === "admin"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {usr.role === "admin" ? "Admin" : "Customer"}
                      </span>
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
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(usr)}
                        className="inline-flex items-center gap-2 rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:border-rose-300"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
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
                  <h2 className="text-lg font-semibold text-slate-900">Team Member Details</h2>
                  <p className="text-sm text-slate-500">Quick snapshot of account information.</p>
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
                  <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewUser.name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Username</p>
                  <p className="text-sm font-medium text-slate-800">
                    {viewUser.username || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-800">{viewUser.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                      viewUser.role === "admin"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {viewUser.role === "admin" ? "Admin" : "Customer"}
                  </span>
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
                  <p className="text-xs uppercase tracking-wide text-slate-400">Joined</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(viewUser.createdAt))}
                  </p>
                </div>
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
                  <h2 className="text-lg font-semibold text-slate-900">Edit Team Member</h2>
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
                  <label className="text-sm font-medium text-slate-600" htmlFor="name">
                    Full Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={formState.name}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. Priya Sharma"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600" htmlFor="username">
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
                  <label className="text-sm font-medium text-slate-600" htmlFor="email">
                    Email Address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    placeholder="e.g. priya@example.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-600" htmlFor="role">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={formState.role}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="customer">Customer</option>
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
                  <h3 className="text-lg font-semibold text-slate-900">Delete Team Member</h3>
                  <p className="text-sm text-slate-500">
                    This will permanently remove {userPendingDelete.name || userPendingDelete.username}
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
    })
  ),
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  onUserUpdated: PropTypes.func,
};

AdminUsersTable.defaultProps = {
  users: [],
  isLoading: false,
  error: "",
  onUserUpdated: undefined,
};

export default AdminUsersTable;
