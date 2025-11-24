import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import Sidebar from "../components/admin/Sidebar";
import Navbar from "../components/admin/Navbar";
import { useAuth } from "../contexts/AuthContext";
import {
  fetchAdminHelpTopics,
  createAdminHelpTopic,
  updateAdminHelpTopic,
  deleteAdminHelpTopic,
} from "../services/helpSupportApi";

const emptyTopic = {
  title: "",
  description: "",
  slug: "",
  order: 0,
  isActive: true,
  responseDelayMs: 2000,
  questions: [
    {
      question: "",
      answer: "",
      order: 0,
    },
  ],
};

const AdminHelpSupportPage = () => {
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState(emptyTopic);
  const { user, logout } = useAuth();

  const selectedTopic = useMemo(
    () => topics.find((topic) => topic._id === selectedTopicId) || null,
    [topics, selectedTopicId]
  );

  const loadTopics = async () => {
    setLoading(true);
    try {
      const payload = await fetchAdminHelpTopics();
      const data = Array.isArray(payload.data) ? payload.data : [];
      setTopics(
        data.sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA === orderB) return a.title.localeCompare(b.title);
          return orderA - orderB;
        })
      );
      setError("");
      if (data.length && !selectedTopicId) {
        setSelectedTopicId(data[0]._id);
      }
    } catch (err) {
      console.error("Failed to load help topics", err);
      setError(err.message || "Failed to load help topics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const openEditor = (topic) => {
    if (topic) {
      setDraft({
        _id: topic._id,
        title: topic.title || "",
        description: topic.description || "",
        slug: topic.slug || "",
        order: topic.order ?? 0,
        isActive: topic.isActive !== false,
        responseDelayMs: topic.responseDelayMs ?? 2000,
        questions: topic.questions?.length
          ? topic.questions.map((item, idx) => ({
              _id: item._id,
              question: item.question || "",
              answer: item.answer || "",
              order: item.order ?? idx,
            }))
          : [...emptyTopic.questions],
      });
    } else {
      setDraft({ ...emptyTopic, questions: [...emptyTopic.questions] });
    }
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setDraft(emptyTopic);
  };

  const handleDraftChange = (changes) => {
    setDraft((prev) => ({ ...prev, ...changes }));
  };

  const updateQuestion = (index, changes) => {
    setDraft((prev) => {
      const next = [...prev.questions];
      next[index] = {
        ...next[index],
        ...changes,
      };
      return { ...prev, questions: next };
    });
  };

  const addQuestion = () => {
    setDraft((prev) => ({
      ...prev,
      questions: [
        ...prev.questions,
        {
          question: "",
          answer: "",
          order: prev.questions.length,
        },
      ],
    }));
  };

  const removeQuestion = (index) => {
    setDraft((prev) => ({
      ...prev,
      questions: prev.questions.filter((_, idx) => idx !== index),
    }));
  };

  const normalizePayload = (payload) => ({
    title: payload.title?.trim(),
    description: payload.description?.trim(),
    slug: payload.slug?.trim() || undefined,
    order: Number(payload.order) || 0,
    isActive: Boolean(payload.isActive),
    responseDelayMs: Math.max(0, Number(payload.responseDelayMs) || 0),
    questions: payload.questions
      .map((item, idx) => ({
        _id: item._id,
        question: item.question?.trim(),
        answer: item.answer?.trim(),
        order: Number.isFinite(Number(item.order)) ? Number(item.order) : idx,
      }))
      .filter((item) => item.question && item.answer),
  });

  const handleSave = async () => {
    if (!draft.title.trim()) {
      toast.error("Topic title is required");
      return;
    }

    const payload = normalizePayload(draft);

    if (!payload.questions.length) {
      toast.error("Add at least one question with an answer");
      return;
    }

    setIsSaving(true);

    try {
      let response;
      if (draft._id) {
        response = await updateAdminHelpTopic(draft._id, payload);
        toast.success("Topic updated");
      } else {
        response = await createAdminHelpTopic(payload);
        toast.success("Topic created");
      }

      const saved = response.data || response;

      setTopics((prev) => {
        const others = prev.filter((topic) => topic._id !== saved._id);
        return [...others, saved].sort((a, b) => {
          const orderA = a.order ?? 0;
          const orderB = b.order ?? 0;
          if (orderA === orderB) return a.title.localeCompare(b.title);
          return orderA - orderB;
        });
      });

      setSelectedTopicId(saved._id);
      closeEditor();
    } catch (err) {
      console.error("Failed to save topic", err);
      toast.error(err.message || "Failed to save topic");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (topicId) => {
    setIsDeleting(true);
    try {
      await deleteAdminHelpTopic(topicId);
      toast.success("Topic deleted");
      setTopics((prev) => prev.filter((topic) => topic._id !== topicId));
      if (selectedTopicId === topicId) {
        setSelectedTopicId(null);
      }
    } catch (err) {
      console.error("Failed to delete topic", err);
      toast.error(err.message || "Failed to delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        adminName={user?.name}
        adminRole={user?.role}
        onLogout={logout}
      />
      <div className="flex">
        <Sidebar
          active="Help & Support"
          className={`${
            isSidebarOpen ? "block" : "hidden md:block"
          } w-full md:w-64 lg:w-72`}
          onNavigate={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Help &amp; Support Manager
              </h1>
              <p className="text-sm text-slate-500">
                Create, update, and organise chatbot topics and quick answers.
              </p>
            </div>
            <button
              onClick={() => openEditor(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold shadow-sm hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Topic
            </button>
          </div>

          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
              <header className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                  Topics
                </h2>
                {loading && (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                )}
              </header>
              <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
                {error ? (
                  <p className="px-5 py-6 text-sm text-rose-500">{error}</p>
                ) : topics.length ? (
                  topics.map((topic) => {
                    const isActive = topic._id === selectedTopicId;
                    return (
                      <button
                        key={topic._id}
                        onClick={() => setSelectedTopicId(topic._id)}
                        className={`w-full text-left px-5 py-4 transition ${
                          isActive
                            ? "bg-blue-50 border-l-4 border-blue-500"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                          {topic.title}
                          {topic.isActive === false ? (
                            <span className="text-[10px] uppercase tracking-wide bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                              Hidden
                            </span>
                          ) : null}
                        </p>
                        {topic.description ? (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {topic.description}
                          </p>
                        ) : null}
                      </button>
                    );
                  })
                ) : (
                  <div className="px-5 py-6 text-sm text-slate-500">
                    {loading
                      ? "Loading topics…"
                      : "No topics yet. Create the first one."}
                  </div>
                )}
              </div>
            </section>

            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
              {selectedTopic ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {selectedTopic.title}
                      </h2>
                      {selectedTopic.description ? (
                        <p className="text-sm text-slate-500 mt-1">
                          {selectedTopic.description}
                        </p>
                      ) : null}
                      <div className="flex flex-wrap gap-2 mt-3 text-xs text-slate-500">
                        <span className="px-3 py-1 border border-slate-200 rounded-full">
                          Order: {selectedTopic.order ?? 0}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-full border ${
                            selectedTopic.isActive === false
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-emerald-50 text-emerald-600 border-emerald-100"
                          }`}
                        >
                          {selectedTopic.isActive === false
                            ? "Hidden"
                            : "Visible"}
                        </span>
                        {selectedTopic.slug ? (
                          <span className="px-3 py-1 border border-slate-200 rounded-full">
                            Slug: {selectedTopic.slug}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditor(selectedTopic)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-blue-600 border border-blue-100 rounded-lg hover:bg-blue-50 transition"
                      >
                        <Pencil size={14} /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(selectedTopic._id)}
                        disabled={isDeleting}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold text-rose-600 border border-rose-100 rounded-lg hover:bg-rose-50 transition disabled:opacity-50"
                      >
                        {isDeleting ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase text-slate-600 tracking-wide">
                      Questions &amp; Answers
                    </h3>
                    <div className="space-y-3">
                      {selectedTopic.questions?.length ? (
                        selectedTopic.questions
                          .slice()
                          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                          .map((qa) => (
                            <div
                              key={qa._id}
                              className="border border-slate-200 rounded-xl p-4 bg-slate-50"
                            >
                              <p className="text-sm font-semibold text-slate-800">
                                {qa.question}
                              </p>
                              <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">
                                {qa.answer}
                              </p>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No questions added yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center py-12 gap-3 text-slate-500">
                  <p className="text-sm">
                    Select a topic on the left to preview its content.
                  </p>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {editorOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/30 backdrop-blur-sm px-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {draft._id ? "Edit Topic" : "Create Topic"}
                </h2>
                <p className="text-xs text-slate-500">
                  Update the category details and associated questions.
                </p>
              </div>
              <button
                onClick={closeEditor}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Title
                  </span>
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(event) =>
                      handleDraftChange({ title: event.target.value })
                    }
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="E.g. Orders & Delivery"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Slug (optional)
                  </span>
                  <input
                    type="text"
                    value={draft.slug}
                    onChange={(event) =>
                      handleDraftChange({ slug: event.target.value })
                    }
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="orders-delivery"
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Display Order
                  </span>
                  <input
                    type="number"
                    value={draft.order}
                    onChange={(event) =>
                      handleDraftChange({ order: Number(event.target.value) })
                    }
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    min={0}
                  />
                </label>
                <label className="flex items-center gap-3 mt-6">
                  <input
                    type="checkbox"
                    checked={draft.isActive}
                    onChange={(event) =>
                      handleDraftChange({ isActive: event.target.checked })
                    }
                    className="h-4 w-4 text-blue-600 border-slate-300 rounded"
                  />
                  <span className="text-sm text-slate-600">
                    Visible to customers
                  </span>
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Response Delay (seconds)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={Number(
                      (draft.responseDelayMs ?? 0) / 1000
                    ).toString()}
                    onChange={(event) =>
                      handleDraftChange({
                        responseDelayMs: Math.max(
                          0,
                          Number(event.target.value) * 1000
                        ),
                      })
                    }
                    className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                    placeholder="e.g. 2"
                  />
                  <span className="text-[11px] text-slate-500">
                    Time the assistant waits before replying. Defaults to 2
                    seconds.
                  </span>
                </label>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Description (optional)
                </span>
                <textarea
                  value={draft.description}
                  onChange={(event) =>
                    handleDraftChange({ description: event.target.value })
                  }
                  rows={3}
                  className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Short summary to help admins identify the topic"
                />
              </label>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                    Questions
                  </h3>
                  <button
                    onClick={addQuestion}
                    className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-2 border border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    <Plus size={14} /> Add Question
                  </button>
                </div>

                <div className="space-y-4">
                  {draft.questions.map((item, index) => (
                    <div
                      key={item._id || index}
                      className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase text-slate-500">
                          Question #{index + 1}
                        </span>
                        {draft.questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(index)}
                            className="text-xs text-rose-500 inline-flex items-center gap-1"
                          >
                            <Trash2 size={14} /> Remove
                          </button>
                        )}
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          Question
                        </span>
                        <input
                          type="text"
                          value={item.question}
                          onChange={(event) =>
                            updateQuestion(index, {
                              question: event.target.value,
                            })
                          }
                          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Enter the customer's question"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          Answer
                        </span>
                        <textarea
                          value={item.answer}
                          onChange={(event) =>
                            updateQuestion(index, {
                              answer: event.target.value,
                            })
                          }
                          rows={3}
                          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                          placeholder="Provide the assistant's response"
                        />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs text-slate-500 uppercase tracking-wide">
                          Display Order
                        </span>
                        <input
                          type="number"
                          value={item.order ?? index}
                          onChange={(event) =>
                            updateQuestion(index, {
                              order: Number(event.target.value),
                            })
                          }
                          min={0}
                          className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <footer className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button
                onClick={closeEditor}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 border border-slate-200 hover:bg-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {isSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}{" "}
                Save Changes
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHelpSupportPage;
