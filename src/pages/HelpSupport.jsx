import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchPublicHelpTopics } from "../services/helpSupportApi";

const initialMessage = {
  sender: "bot",
  text: "Hi! I'm the MegaMart assistant. Choose a topic below and I'll share the answers you need.",
};

const HelpSupport = () => {
  const [messages, setMessages] = useState([initialMessage]);
  const [helpTopics, setHelpTopics] = useState([]);
  const [currentSectionId, setCurrentSectionId] = useState(null);
  const [lastQuestionId, setLastQuestionId] = useState(null);
  const [repeatStreak, setRepeatStreak] = useState(0);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState("");
  const chatRef = useRef(null);
  const pendingTimersRef = useRef([]);

  const sectionsById = useMemo(() => {
    const map = new Map();
    helpTopics.forEach((section) => {
      map.set(section.id, section);
    });
    return map;
  }, [helpTopics]);

  const activeSection = currentSectionId
    ? sectionsById.get(currentSectionId) || null
    : null;

  const quickReplies = useMemo(() => {
    if (!activeSection) {
      return helpTopics.map((section) => ({
        type: "category",
        id: section.id,
        label: section.category,
      }));
    }

    return [
      ...activeSection.items.map((item) => ({
        type: "question",
        id: item.id,
        label: item.question,
        item,
      })),
      {
        type: "back",
        id: "back-to-topics",
        label: "Back to all topics",
      },
    ];
  }, [activeSection, helpTopics]);

  useEffect(() => {
    if (!chatRef.current) return;
    chatRef.current.scrollTo({
      top: chatRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    let isActive = true;
    const loadTopics = async () => {
      setLoadingTopics(true);
      try {
        const payload = await fetchPublicHelpTopics();
        if (!isActive) return;
        const data = Array.isArray(payload.data) ? payload.data : [];
        const normalized = data
          .filter((topic) => topic && topic.isActive !== false)
          .map((topic) => ({
            id: topic.slug || topic._id,
            category: topic.title,
            description: topic.description,
            items: Array.isArray(topic.questions)
              ? topic.questions
                  .filter((question) => question?.question && question?.answer)
                  .map((question) => ({
                    id: question._id || question.question,
                    question: question.question,
                    answer: question.answer,
                    order: question.order ?? 0,
                  }))
              : [],
            order: topic.order ?? 0,
            isActive: topic.isActive !== false,
            responseDelayMs:
              typeof topic.responseDelayMs === "number"
                ? Math.max(0, topic.responseDelayMs)
                : 2000,
          }))
          .filter((topic) => topic.category?.trim() && topic.items.length)
          .sort((a, b) => {
            const orderA = a.order ?? 0;
            const orderB = b.order ?? 0;
            return orderA - orderB;
          });

        setHelpTopics(normalized);
        setTopicsError("");
      } catch (error) {
        console.error("Failed to load help topics", error);
        if (!isActive) return;
        setTopicsError(error.message || "Failed to load help topics");
        setHelpTopics([]);
      } finally {
        if (isActive) setLoadingTopics(false);
      }
    };

    loadTopics();

    return () => {
      isActive = false;
    };
  }, []);

  const handleCategorySelect = (sectionId) => {
    const section = sectionsById.get(sectionId);
    if (!section) return;

    setMessages((prev) => [
      ...prev,
      { sender: "user", text: section.category },
      {
        sender: "bot",
        text: `Here are the top questions about ${section.category}. Pick one to learn more.`,
      },
    ]);

    setCurrentSectionId(section.id);
    setLastQuestionId(null);
    setRepeatStreak(0);
  };

  useEffect(() => {
    return () => {
      pendingTimersRef.current.forEach((timeoutId) => clearTimeout(timeoutId));
      pendingTimersRef.current = [];
    };
  }, []);

  const handleQuestionSelect = (item) => {
    if (!activeSection) return;

    const isRepeat = lastQuestionId === item.id;
    const nextRepeat = isRepeat ? repeatStreak + 1 : 1;
    const delayMs = Math.max(0, activeSection.responseDelayMs ?? 2000);
    const typingToken = `typing-${Date.now()}-${Math.random()}`;

    setMessages((prev) => {
      return [
        ...prev,
        { sender: "user", text: item.question },
        { sender: "bot", text: "Thinking...", tempId: typingToken },
      ];
    });
    const timeoutId = setTimeout(() => {
      setMessages((prev) => {
        const placeholderIndex = prev.findIndex(
          (message) => message.tempId === typingToken
        );

        const withoutPlaceholder =
          placeholderIndex !== -1
            ? [
                ...prev.slice(0, placeholderIndex),
                ...prev.slice(placeholderIndex + 1),
              ]
            : [...prev];

        const updated = [
          ...withoutPlaceholder,
          { sender: "bot", text: item.answer },
        ];

        if (isRepeat && nextRepeat >= 2) {
          updated.push({
            sender: "bot",
            text: "Let's revisit the main topics. Choose what you'd like help with.",
          });
        }

        return updated;
      });

      if (isRepeat && nextRepeat >= 2) {
        setCurrentSectionId(null);
        setLastQuestionId(null);
        setRepeatStreak(0);
      } else {
        setLastQuestionId(item.id);
        setRepeatStreak(nextRepeat);
      }

      pendingTimersRef.current = pendingTimersRef.current.filter(
        (id) => id !== timeoutId
      );
    }, delayMs);

    pendingTimersRef.current.push(timeoutId);
  };

  const handleBackToTopics = () => {
    setMessages((prev) => [
      ...prev,
      {
        sender: "bot",
        text: "Sure, here are all the topics again. What can I help you with?",
      },
    ]);
    setCurrentSectionId(null);
    setLastQuestionId(null);
    setRepeatStreak(0);
  };

  const resetConversation = () => {
    setMessages([initialMessage]);
    setCurrentSectionId(null);
    setLastQuestionId(null);
    setRepeatStreak(0);
  };

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-gray-50 via-white to-gray-100 py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
          <div className="bg-[#008ECC] text-white px-6 sm:px-10 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold">Help &amp; Support</h1>
              <p className="text-sm sm:text-base opacity-90 mt-1">
                Your one-stop assistant for orders, returns, and payments.
              </p>
            </div>
            <button
              onClick={resetConversation}
              className="bg-white/15 hover:bg-white/25 transition-colors text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-full"
            >
              Reset Chat
            </button>
          </div>

          <div className="grid lg:grid-cols-[1.8fr_1fr]">
            <div className="flex flex-col border-r border-gray-100 bg-white">
              <div
                ref={chatRef}
                className="h-[420px] md:h-[460px] overflow-y-auto px-6 sm:px-8 py-6 space-y-4 bg-gradient-to-b from-gray-50 to-white"
              >
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.sender === "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        message.sender === "user"
                          ? "bg-[#008ECC] text-white rounded-br-none"
                          : "bg-gray-100 text-gray-900 rounded-bl-none"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-100 px-6 sm:px-8 py-5 bg-white">
                <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                  {activeSection ? "Select a question" : "Choose a topic"}
                </p>
                {topicsError && !loadingTopics && !helpTopics.length ? (
                  <p className="text-sm text-rose-500">{topicsError}</p>
                ) : null}
                {!topicsError && !loadingTopics && !helpTopics.length ? (
                  <p className="text-sm text-gray-500">
                    Help topics will appear here once the admin adds them.
                  </p>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {loadingTopics && !activeSection ? (
                    <span className="text-xs text-gray-500">
                      Loading topics…
                    </span>
                  ) : null}
                  {quickReplies.map((reply) => {
                    if (reply.type === "category") {
                      return (
                        <button
                          key={reply.id}
                          onClick={() => handleCategorySelect(reply.id)}
                          className="w-full text-xs sm:text-sm border border-[#008ECC] text-[#008ECC] hover:bg-[#008ECC] hover:text-white transition-all px-4 py-2 rounded-full shadow-sm"
                        >
                          {reply.label}
                        </button>
                      );
                    }

                    if (reply.type === "question" && reply.item) {
                      return (
                        <button
                          key={reply.id}
                          onClick={() => handleQuestionSelect(reply.item)}
                          className="w-full text-xs sm:text-sm border border-[#008ECC] text-[#008ECC] hover:bg-[#008ECC] hover:text-white transition-all px-4 py-2 rounded-full shadow-sm"
                        >
                          {reply.label}
                        </button>
                      );
                    }

                    return (
                      <button
                        key={reply.id}
                        onClick={handleBackToTopics}
                        className="w-full text-xs sm:text-sm border border-gray-300 text-gray-600 hover:bg-gray-100 transition-all px-4 py-2 rounded-full shadow-sm"
                      >
                        {reply.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <aside className="hidden lg:block bg-gradient-to-b from-white to-gray-50 px-6 py-8 space-y-8">
              {helpTopics.map((section) => (
                <div key={section.id}>
                  <button
                    onClick={() => handleCategorySelect(section.id)}
                    className={`text-sm font-semibold uppercase tracking-wide mb-3 transition-colors ${
                      currentSectionId === section.id
                        ? "text-[#008ECC]"
                        : "text-gray-700 hover:text-[#008ECC]"
                    }`}
                  >
                    {section.category}
                  </button>
                  {currentSectionId === section.id && (
                    <ul className="space-y-2 pl-1">
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => handleQuestionSelect(item)}
                            className="text-sm text-left text-gray-600 hover:text-[#008ECC] transition-colors"
                          >
                            {item.question}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          onClick={handleBackToTopics}
                          className="text-sm text-left text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Back to all topics
                        </button>
                      </li>
                    </ul>
                  )}
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
