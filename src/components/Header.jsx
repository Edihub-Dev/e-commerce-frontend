import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  Home,
  Phone,
  ShoppingCart,
  Menu,
  X,
  User,
  Search as SearchIcon,
  Bell,
  Settings,
  LayoutDashboard,
  Truck,
  ArrowRight,
  Tag,
  Gift,
  Percent,
  LogOut,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useCart } from "../contexts/CartContext";
import { useSearch } from "../contexts/SearchContext";
import {
  setAddresses,
  setAddressLoading,
  setAddressError,
  resetAddressState,
} from "../store/slices/addressSlice";
import { resetCheckout } from "../store/slices/checkoutSlice";
import { fetchAddresses, fetchProducts } from "../utils/api";

const DEFAULT_LOCATION_LABEL = "Loading delivery address...";
const LOCATION_STORAGE_KEY = "p2pdeal:lastLocationLabel";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isProfilePinned, setIsProfilePinned] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [locationLabel, setLocationLabel] = useState(DEFAULT_LOCATION_LABEL);
  const [navCategories, setNavCategories] = useState([]);
  const searchInputRef = useRef(null);
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const { cartCount } = useCart();
  const { searchQuery, setSearchQuery, searchProducts } = useSearch();
  const profileMenuRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { addresses, loading: addressesLoading } = useSelector(
    (state) => state.address
  );
  const { shippingAddress } = useSelector((state) => state.checkout);

  const persistLocationLabel = useCallback(
    (nextLabel) => {
      try {
        if (!isAuthenticated) {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          return;
        }

        const trimmed = (nextLabel || "").trim();
        if (
          !trimmed ||
          trimmed === DEFAULT_LOCATION_LABEL ||
          trimmed === "Add delivery address"
        ) {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
          return;
        }

        localStorage.setItem(LOCATION_STORAGE_KEY, trimmed);
      } catch (error) {
        console.debug("Persist location label failed", error);
      }
    },
    [isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const storedLabel = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (storedLabel) {
        setLocationLabel(storedLabel);
      }
    } catch (error) {
      console.debug("Restore location label failed", error);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Show header when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      }
      // Hide header when scrolling down
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [lastScrollY]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setIsProfileMenuOpen(false);
        setIsProfilePinned(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsProfileMenuOpen(false);
      setIsProfilePinned(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const { data } = await fetchProducts({ limit: 200 });
        if (!active) return;

        const categoryMap = new Map();
        data.forEach((product) => {
          const rawName =
            typeof product.category === "string" ? product.category : "Other";
          const name = rawName.trim();
          if (!name) return;

          const slug = encodeURIComponent(
            name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "") || "other"
          );

          if (!categoryMap.has(name)) {
            categoryMap.set(name, { name, slug });
          }
        });

        const categoriesList = Array.from(categoryMap.values()).slice(0, 12);
        setNavCategories(categoriesList);
      } catch (error) {
        console.error("Failed to load navigation categories", error);
        if (active) {
          setNavCategories([]);
        }
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || addresses.length || addressesLoading) {
      return;
    }

    let isMounted = true;

    const loadAddresses = async () => {
      dispatch(setAddressLoading(true));
      try {
        const response = await fetchAddresses();
        const data = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.addresses)
          ? response.addresses
          : Array.isArray(response?.data?.addresses)
          ? response.data.addresses
          : [];
        if (isMounted) {
          dispatch(setAddresses(data));
        }
      } catch (error) {
        if (isMounted) {
          const message =
            error?.response?.data?.message ||
            error?.message ||
            "Failed to load addresses";
          dispatch(setAddressError(message));
        }
      } finally {
        if (isMounted) {
          dispatch(setAddressLoading(false));
        }
      }
    };

    loadAddresses();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, addresses.length, addressesLoading, dispatch]);

  useEffect(() => {
    const formatLocation = (addressLike) => {
      if (!addressLike) return null;

      const formatted = addressLike.formattedAddress?.trim();
      if (formatted) {
        return formatted.length > 55
          ? `${formatted.slice(0, 52)}...`
          : formatted;
      }

      const city = addressLike.city?.trim();
      const state = addressLike.state?.trim();
      const pincode =
        addressLike.pincode?.toString().trim() ||
        addressLike.zipCode?.toString().trim();
      const parts = [city || state, pincode].filter(Boolean);
      return parts.length ? `Deliver to ${parts.join(" - ")}` : null;
    };

    const shippingLabel = formatLocation(shippingAddress);
    if (shippingLabel) {
      setLocationLabel(shippingLabel);
      persistLocationLabel(shippingLabel);
      return;
    }

    if (!isAuthenticated) {
      setLocationLabel(DEFAULT_LOCATION_LABEL);
      persistLocationLabel(DEFAULT_LOCATION_LABEL);
      return;
    }

    const defaultAddress =
      addresses.find((address) => address.isDefault) || addresses[0] || null;
    const defaultLabel = formatLocation(defaultAddress);
    if (defaultLabel) {
      setLocationLabel(defaultLabel);
      persistLocationLabel(defaultLabel);
      return;
    }

    if (addressesLoading) {
      setLocationLabel("Loading delivery address...");
      persistLocationLabel("Loading delivery address...");
      return;
    }

    const fallbackLabel = formatLocation(user || {});
    const resolvedLabel = fallbackLabel || "Add delivery address";
    setLocationLabel(resolvedLabel);
    persistLocationLabel(resolvedLabel);
  }, [
    isAuthenticated,
    addresses,
    addressesLoading,
    shippingAddress,
    user,
    persistLocationLabel,
  ]);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    setIsProfilePinned(false);
    dispatch(resetAddressState());
    dispatch(resetCheckout());
    logout();
    setLocationLabel(DEFAULT_LOCATION_LABEL);
    try {
      localStorage.removeItem(LOCATION_STORAGE_KEY);
    } catch (error) {
      console.debug("Failed to clear stored location label", error);
    }
  };

  const handleProfileButtonClick = () => {
    setIsProfilePinned((prevPinned) => {
      const nextPinned = !prevPinned;
      setIsProfileMenuOpen(nextPinned);
      return nextPinned;
    });
  };

  const handleProfileMouseEnter = () => {
    if (!isProfilePinned) {
      setIsProfileMenuOpen(true);
    }
  };

  const handleProfileMouseLeave = () => {
    if (!isProfilePinned) {
      setIsProfileMenuOpen(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (localSearchQuery.trim()) {
      setSearchQuery(localSearchQuery);
      navigate(`/search?q=${encodeURIComponent(localSearchQuery)}`);
      setLocalSearchQuery("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleSearch(e);
    }
  };

  const clearSearch = () => {
    setLocalSearchQuery("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const renderedCategories = navCategories.length
    ? navCategories
    : [{ name: "All Products", slug: "" }];

  const mobileMenuItemClasses =
    "flex items-center gap-2 rounded-xl px-3 py-2 -mx-3 text-sm font-medium text-secondary hover:bg-slate-100 active:bg-slate-200 transition-colors";

  return (
    <header
      className={`bg-white shadow-sm sticky top-0 z-40 transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* Top Bar */}
      <div className="bg-medium-bg text-medium-text text-sm hidden lg:block">
        <div className="container mx-auto px-16 py-2 flex justify-between items-center">
          <div>Welcome to worldwide p2pdeal!</div>
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <MapPin size={16} style={{ color: "#008ECC" }} />
              <span>{locationLabel}</span>
            </div>
            <div className="h-4 border-l border-gray-300"></div>
            <Link
              to="/orders"
              className="flex items-center space-x-2 hover:text-[#008ECC]"
            >
              <Truck size={16} style={{ color: "#008ECC" }} />
              <span>Track your order</span>
            </Link>
            <div className="h-4 border-l border-gray-300"></div>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("open-offer-lightbox", {
                    detail: { source: "header" },
                  })
                );
              }}
              className="flex items-center space-x-2 text-left outline-none"
            >
              <Percent size={16} style={{ color: "#008ECC" }} />
              <span className="font-medium text-secondary">All Offers</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div
        className={`container mx-auto px-4 sm:px-8 lg:px-16 py-3 lg:py-4 ${
          isMenuOpen ? "hidden lg:block" : ""
        }`}
      >
        <div className="flex items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-md border border-gray-200 text-[#008ECC] hover:bg-gray-100 transition-colors"
              aria-label={
                isMenuOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={isMenuOpen}
            >
              {isMenuOpen ? <X size={22} /> : <Menu size={24} />}
            </button>

            <Link
              to="/"
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: "#008ECC" }}
            >
              p2pdeal
            </Link>
          </div>

          {/* Search Bar */}
          <div
            className={`flex-1 max-w-xl hidden md:flex items-center bg-white border rounded-md transition-all duration-200 ${
              isSearchFocused
                ? "ring-2 ring-[#008ECC] border-[#008ECC]"
                : "border-gray-200"
            }`}
          >
            <SearchIcon size={20} className="ml-3 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              placeholder="Search T-SHIRTS, Office Essentials, Accessories and more..."
              className="bg-transparent py-2 px-3 w-full focus:outline-none text-sm text-gray-800 placeholder-gray-400 rounded-r-md"
              aria-label="Search products"
            />
            {localSearchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <XIcon size={18} />
              </button>
            )}
          </div>

          {/* Right: Sign In, Cart */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Sign In */}
            {isAuthenticated ? (
              <div
                className="relative hidden md:block"
                ref={profileMenuRef}
                onMouseEnter={handleProfileMouseEnter}
                onMouseLeave={handleProfileMouseLeave}
              >
                <button
                  type="button"
                  onClick={handleProfileButtonClick}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 hover:border-[#008ECC] hover:text-[#008ECC] transition-colors"
                >
                  <User size={20} style={{ color: "#008ECC" }} />
                  <span className="text-sm" style={{ color: "#000000" }}>
                    {user?.name || user?.username || "My Account"}
                  </span>
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 transition-transform ${
                      isProfileMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    {isAdmin && (
                      <Link
                        to="/admin"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          setIsProfilePinned(false);
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Admin Profile
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfilePinned(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Profile
                    </Link>
                    <Link
                      to="/orders"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsProfilePinned(false);
                      }}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      My Orders
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center text-sm">
                <User size={20} style={{ color: "#008ECC" }} />
                <div className="ml-2 flex items-center gap-2">
                  <Link
                    to="/signup"
                    className="hover:text-[#008ECC] transition-colors"
                  >
                    Sign Up
                  </Link>
                  <span className="text-gray-300">/</span>
                  <Link
                    to="/login"
                    className="hover:text-[#008ECC] transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              </div>
            )}

            {/* Cart */}
            <Link
              to="/cart"
              className="flex items-center relative hover:opacity-80"
            >
              <ShoppingCart size={20} style={{ color: "#008ECC" }} />
              <span
                className="ml-2 text-sm hidden lg:inline"
                style={{ color: "#000000" }}
              >
                Cart
              </span>
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    className="absolute -top-2 -right-2 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    key={cartCount}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            className="lg:hidden bg-white absolute top-full left-0 w-full h-screen z-30 border-t flex flex-col"
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between">
                <span
                  className="text-lg font-semibold"
                  style={{ color: "#008ECC" }}
                >
                  Menu
                </span>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="inline-flex items-center justify-center p-2 rounded-full border border-gray-200 text-gray-500 hover:text-[#008ECC] hover:border-[#008ECC] transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="px-4 pt-2">
              <div className="flex items-center bg-light-bg border border-gray-200 rounded-md">
                <input
                  type="text"
                  placeholder="Search..."
                  className="bg-transparent py-2 px-4 w-full focus:outline-none"
                />
                <button className="p-2 text-medium-text">
                  <SearchIcon size={20} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-8">
              <nav>
                <ul>
                  {renderedCategories.map((cat, index) => (
                    <li key={cat.slug || index} className="border-b">
                      <Link
                        to={cat.slug ? `/category/${cat.slug}` : "/shop"}
                        className="flex justify-between items-center py-3 text-secondary transition-colors hover:bg-slate-100 hover:text-primary px-3 -mx-3 rounded-xl"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {cat.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-6 border-t pt-6 space-y-4">
                {isAuthenticated ? (
                  <>
                    {isAdmin && (
                      <Link
                        to="/admin"
                        className={mobileMenuItemClasses}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-5 w-5" />
                        <span>Admin Profile</span>
                      </Link>
                    )}
                    <Link
                      to="/profile"
                      className={mobileMenuItemClasses}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span>My Profile</span>
                    </Link>
                    <Link
                      to="/orders"
                      className={mobileMenuItemClasses}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <User className="h-5 w-5" />
                      <span>My Orders</span>
                    </Link>
                  </>
                ) : (
                  <div className="flex flex-col gap-3 text-sm">
                    <Link
                      to="/signup"
                      onClick={() => setIsMenuOpen(false)}
                      className={mobileMenuItemClasses}
                    >
                      <User className="h-5 w-5" />
                      <span>Sign Up</span>
                    </Link>
                    <Link
                      to="/login"
                      onClick={() => setIsMenuOpen(false)}
                      className={mobileMenuItemClasses}
                    >
                      <User className="h-5 w-5" />
                      <span>Sign In</span>
                    </Link>
                  </div>
                )}
                <Link
                  to="/cart"
                  onClick={() => setIsMenuOpen(false)}
                  className={`${mobileMenuItemClasses} relative`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>Cart</span>
                  {cartCount > 0 && (
                    <span className="ml-auto bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {cartCount}
                    </span>
                  )}
                </Link>
                {isAuthenticated && (
                  <div className="border-t border-slate-200 pt-4 flex justify-end">
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 active:bg-rose-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Search Bar - Only visible on small screens */}
      <div
        className={`md:hidden border-t border-gray-100 px-4 py-3 bg-white ${
          isMenuOpen ? "hidden" : ""
        }`}
      >
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
          />
          <form onSubmit={handleSearch} className="w-full">
            <input
              type="text"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              placeholder="Search products..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#008ECC] focus:border-transparent text-sm"
              aria-label="Search products"
            />
          </form>
          {localSearchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
