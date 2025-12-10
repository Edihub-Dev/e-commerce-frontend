import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import HeroCarousel from "../components/home/HeroCarousel";
import DealsSection from "../components/home/DealsSection";
import OfferLightboxModal from "../components/home/OfferLightboxModal";
import { useSearch } from "../contexts/SearchContext";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
// import CategoriesSection from '../components/home/CategoriesSection';
// import BrandsSection from '../components/home/BrandsSection';
// import DailyEssentialsSection from '../components/home/DailyEssentialsSection';
import { pageVariants } from "../utils/animations";

const Home = () => {
  const { searchQuery, setSearchQuery, searchProducts } = useSearch();
  const [mobileQuery, setMobileQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setMobileQuery(searchQuery || "");
  }, [searchQuery]);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const trimmed = mobileQuery.trim();
      if (!trimmed) {
        setSearchQuery("");
        searchProducts("");
        return;
      }

      setSearchQuery(trimmed);
      searchProducts(trimmed);
      navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    },
    [mobileQuery, setSearchQuery, searchProducts, navigate]
  );

  const handleClear = useCallback(() => {
    setMobileQuery("");
    setSearchQuery("");
    searchProducts("");
    navigate("/");
  }, [setSearchQuery, searchProducts, navigate]);

  return (
    <motion.div
      className="space-y-0 md:space-y-0 mb-0"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <OfferLightboxModal />
      <div className="md:hidden mt-3 mb-4">
        <form
          onSubmit={handleSubmit}
          className={`mx-4 flex items-center rounded-full border bg-white px-4 py-2 shadow-sm transition focus-within:ring-2 focus-within:ring-blue-100 ${
            isFocused ? "border-blue-400" : "border-slate-200"
          }`}
        >
          <SearchIcon className="h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={mobileQuery}
            onChange={(event) => setMobileQuery(event.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Search products, categories…"
            className="ml-3 flex-1 border-0 bg-transparent text-sm text-slate-600 placeholder:text-slate-400 focus:outline-none"
            aria-label="Search products"
          />
          {mobileQuery ? (
            <button
              type="button"
              onClick={handleClear}
              className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          ) : null}
        </form>
      </div>
      <div className="mt-4 md:mt-0">
        <HeroCarousel />
      </div>
      <div className="container mx-auto px-4 space-y-8 md:space-y-12">
        <DealsSection />
        {/* Commented out sections as per request
        <CategoriesSection />
        <BrandsSection />
        <DailyEssentialsSection />
        */}
      </div>
    </motion.div>
  );
};

export default Home;
