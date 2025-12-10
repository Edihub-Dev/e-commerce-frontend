import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import SeoHead from "../components/seo/SeoHead";

const Home = () => {
  const { searchQuery, setSearchQuery, searchProducts } = useSearch();
  const [mobileQuery, setMobileQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();

  const structuredData = useMemo(
    () => [
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "p2pdeal",
        url: "https://shop.p2pdeal.net",
        potentialAction: {
          "@type": "SearchAction",
          target: "https://shop.p2pdeal.net/search?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Do you offer bulk pricing for corporate orders?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Yes. p2pdeal provides tiered bulk pricing, design support, and doorstep delivery for corporate teams, events, and reseller partners across India.",
            },
          },
          {
            "@type": "Question",
            name: "What products can I customize on p2pdeal?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You can personalize apparel, caps, mugs, drinkware, stationery, office essentials, keychains, hampers, and other corporate gifting merchandise.",
            },
          },
          {
            "@type": "Question",
            name: "How fast can you ship branded merchandise?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Standard production takes 3-5 business days after artwork approval. Express timelines are available for urgent projects subject to stock and design complexity.",
            },
          },
        ],
      },
    ],
    []
  );

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
    <>
      <SeoHead
        title="Custom Merchandise & Corporate Gifts Online | p2pdeal"
        description="Order personalized t-shirts, caps, mugs, stationery, hampers, and corporate gifts from p2pdeal. Premium customization, bulk pricing, and PAN-India delivery."
        keywords={[
          "custom merchandise India",
          "corporate gifts",
          "custom t-shirts",
          "custom mugs",
          "custom caps",
          "office essentials",
          "promotional products",
        ]}
        canonicalPath="/"
        openGraph={{
          title: "Custom Merchandise & Corporate Gifts Online | p2pdeal",
          description:
            "Discover customizable apparel, headwear, drinkware, stationery, and corporate gift hampers crafted for teams, events, and campaigns.",
          image: "/assets/og/p2pdeal-home-og.jpg",
        }}
        twitter={{
          title: "Design Custom Merchandise with p2pdeal",
          description:
            "Get premium branded merchandise, fast printing, and nationwide delivery for your business or event.",
        }}
        schema={structuredData}
      />
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
          <section className="bg-slate-50 rounded-3xl p-6 md:p-10 shadow-sm border border-slate-100">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">
              Premium Custom Merchandise for Every Brand Moment
            </h2>
            <p className="text-slate-600 leading-relaxed">
              From startup launch kits to enterprise gifting, p2pdeal delivers
              high-quality, customizable merchandise that keeps your brand in
              focus. Choose from brushed cotton t-shirts, embroidered caps,
              ceramic mugs, drinkware, diaries, pens, and bespoke
              hampers—crafted with long-lasting prints and immaculate finishing.
              Our in-house design team, color-managed production, and strict QC
              ensure your logo looks sharp on every item.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Why Businesses Trust p2pdeal
                </h3>
                <ul className="space-y-2 text-slate-600 text-sm leading-relaxed">
                  <li>• Bulk-friendly pricing with transparent MOQs</li>
                  <li>• Artwork proofing & design assistance before print</li>
                  <li>• Nationwide logistics support with dispatch tracking</li>
                  <li>• Eco-conscious material options on request</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Custom Merchandise Categories
                </h3>
                <ul className="space-y-2 text-slate-600 text-sm leading-relaxed">
                  <li>• Cotton & dri-fit t-shirts, polos, hoodies</li>
                  <li>• Caps, bucket hats, and sports headwear</li>
                  <li>• Mugs, tumblers, sippers, and drinkware sets</li>
                  <li>• Stationery: diaries, notebooks, pens, office kits</li>
                  <li>• Premium gift hampers, onboarding kits, accessories</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Industries We Serve
                </h3>
                <ul className="space-y-2 text-slate-600 text-sm leading-relaxed">
                  <li>• Startups & tech companies scaling culture</li>
                  <li>• Corporate HR & procurement teams</li>
                  <li>• Marketing agencies & event planners</li>
                  <li>• Colleges, NGOs, and community clubs</li>
                </ul>
              </div>
            </div>
          </section>
          <section className="grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Bulk Ordering Made Effortless
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Upload your artwork, confirm digital proofs, and let us handle
                production and fulfillment. Dedicated account specialists help
                you coordinate sizing breakdowns, personalized naming, and
                last-mile delivery. Our manufacturing partners across India keep
                lead times fast—ideal for marketing campaigns, annual meets, and
                festive gifting.
              </p>
            </div>
            <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">
                Ready-to-Launch Corporate Gift Kits
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Choose curated onboarding boxes, festive hampers, or tailor-made
                appreciation kits combining apparel, accessories, and
                stationery. Every kit is finished with custom packaging and
                message cards so your recipients feel the brand love from the
                first unboxing.
              </p>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
};

export default Home;
