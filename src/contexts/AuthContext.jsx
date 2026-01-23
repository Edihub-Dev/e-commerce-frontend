import React, { createContext, useState, useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api, { FORCE_LOGOUT_EVENT } from "../utils/api";

const AuthContext = createContext(null);

const decodeTokenPayload = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Failed to decode token payload", error);
    return null;
  }
};

const isTokenExpired = (token) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) return false;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  return payload.exp <= nowInSeconds;
};

const normalizeUser = (user) => {
  if (!user) return null;
  return {
    ...user,
    role: user.role || "customer",
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");

      if (token && isTokenExpired(token)) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setLoading(false);
        toast.info("Session expired. Please log in again.", {
          autoClose: 1500,
        });
        return;
      }

      if (storedUser && token) {
        const parsedUser = normalizeUser(JSON.parse(storedUser));
        setUser(parsedUser);
        if (parsedUser.role !== JSON.parse(storedUser).role) {
          localStorage.setItem("user", JSON.stringify(parsedUser));
        }
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleForceLogout = (event) => {
      const detail = event?.detail || {};

      try {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
      } catch (storageError) {
        console.warn(
          "Failed to clear auth storage on force logout",
          storageError,
        );
      }

      setUser(null);
      setIsAuthenticated(false);

      const message =
        detail.message || "Please verify your email before continuing.";
      const toastType = detail.type === "warning" ? toast.warning : toast.info;
      toastType(message, { autoClose: 1800 });

      const redirectPath =
        typeof detail.redirect === "string" ? detail.redirect : "/login";
      navigate(redirectPath, { replace: true });
    };

    window.addEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);

    return () => {
      window.removeEventListener(FORCE_LOGOUT_EVENT, handleForceLogout);
    };
  }, [navigate]);

  const login = async (credentials) => {
    try {
      const { data } = await api.post("/auth/login", credentials);

      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("authToken", data.token);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      toast.success("Logged in successfully!", { autoClose: 1000 });
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message || "Failed to log in. Please try again.";
      throw new Error(message);
    }
  };

  const signup = async (userData) => {
    try {
      const { data } = await api.post("/auth/register", userData);
      toast.success(
        data.message || "Account created. Check your email for the code.",
        { autoClose: 1000 },
      );
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to create account. Please try again.";
      throw new Error(message);
    }
  };

  const verifyEmail = async ({ email, otp }) => {
    try {
      const { data } = await api.post("/auth/verify-email", { email, otp });

      const normalizedUser = normalizeUser(data.user);
      localStorage.setItem("user", JSON.stringify(normalizedUser));
      localStorage.setItem("authToken", data.token);
      setUser(normalizedUser);
      setIsAuthenticated(true);
      toast.success(data.message || "Email verified successfully!", {
        autoClose: 1000,
      });
      return data;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Failed to verify email. Please try again.";
      throw new Error(message);
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthenticated(false);
    toast.info("Logged out.", { autoClose: 1000 });
  };

  const updateProfile = async (payload) => {
    try {
      const response = await api.put("/user/profile", payload);
      const refreshed = normalizeUser(response?.data?.data || {});

      if (refreshed?.name) {
        setUser((prev) => ({ ...prev, ...refreshed }));
        const stored = localStorage.getItem("user");
        const parsed = stored ? JSON.parse(stored) : null;
        const merged = { ...(parsed || {}), ...refreshed };
        localStorage.setItem("user", JSON.stringify(merged));
      }

      toast.success(response?.data?.message || "Profile updated", {
        autoClose: 1200,
      });

      return refreshed;
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.message ||
        "Failed to update profile";
      toast.error(message);
      throw new Error(message);
    }
  };

  const isAdmin = Boolean(user?.role === "admin");

  const isSeller = Boolean(user?.role === "seller");

  const isSubadmin = Boolean(user?.role === "subadmin");

  const value = {
    user,
    isAuthenticated,
    isAdmin,
    isSeller,
    isSubadmin,
    loading,
    login,
    signup,
    verifyEmail,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
