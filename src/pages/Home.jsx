import React, { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import HeroCarousel from "../components/home/HeroCarousel";
import SellerSection from "../components/home/SelllerSection";
import OfferLightboxModal from "../components/home/OfferLightboxModal";
import { useSearch } from "../contexts/SearchContext";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, X } from "lucide-react";
// import CategoriesSection from '../components/home/CategoriesSection';
// import BrandsSection from '../components/home/BrandsSection';
// import DailyEssentialsSection from '../components/home/DailyEssentialsSection';
import { pageVariants } from "../utils/animations";
import SeoHead from "../components/seo/SeoHead";

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
      <SeoHead
        title="MST Blockchain Merchandise | Crypto Merchandise & Blockchain Merch India"
        description="Shop MST Blockchain official polo t-shirt (white edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain white logo cap and blockchain premium metal keychain. Premium crypto merchandise and blockchain merch india with fast delivery across India."
        keywords="crypto merchandise, blockchain merch india, mst merch india, blockchain official polo t-shirt (white edition), blockchain official polo t-shirt (yellow edition), blockchain official polo t-shirt (blue edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain executive diary + pen set, blockchain white logo cap, blockchain premium metal keychain, blockchain premium metal avenger keychain, blockchain premium metal spider keychain, blockchain premium metal spartan keychain, blockchain premium metal legend keychain, blockchain premium metal warrior keychain, best price blockchain official polo t-shirt (white edition) india, blockchain official polo t-shirt (white edition) under budget, affordable blockchain official polo t-shirt (white edition) online, best price blockchain ceramic coffee mug india, blockchain ceramic coffee mug under budget, affordable blockchain ceramic coffee mug online"
        canonicalPath="/"
        openGraph={{
          title:
            "MST Blockchain Official Store | Crypto Merchandise & Blockchain Merch India",
          description:
            "Discover official MST Blockchain merchandise including blockchain official polo t-shirt (white edition, yellow edition, blue edition), blockchain ceramic coffee mug, blockchain executive diary + pen set, blockchain white logo cap and blockchain premium metal keychains.",
          image:
            "https://shop.p2pdeal.net/images/og/mst-blockchain-merch-home.jpg",
          type: "website",
        }}
        twitter={{
          title:
            "MST Blockchain Merchandise | Crypto Merchandise & Blockchain Merch India",
          description:
            "Buy mst merch india with blockchain official polo t-shirt (white edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain white logo cap and blockchain premium metal keychain at best price in India.",
          image:
            "https://shop.p2pdeal.net/images/og/mst-blockchain-merch-home.jpg",
        }}
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "MST Blockchain Merchandise",
            url: "https://shop.p2pdeal.net/",
            logo: "https://shop.p2pdeal.net/logo.png",
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "MST Blockchain Official Store",
            url: "https://shop.p2pdeal.net/",
            potentialAction: {
              "@type": "SearchAction",
              target: "https://shop.p2pdeal.net/search?q={search_term_string}",
              "query-input": "required name=search_term_string",
            },
          },
        ]}
      />
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
        <SellerSection />
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
