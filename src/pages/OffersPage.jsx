import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { fetchOfferLightboxes } from "../services/offerLightboxApi";
import OfferLightboxCard from "../components/offers/OfferLightboxCard";

const OffersPage = () => {
  const [offers, setOffers] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadOffers = async () => {
      setStatus("loading");
      setError(null);
      try {
        const data = await fetchOfferLightboxes({ offersOnly: true });
        if (!isMounted) return;
        setOffers(Array.isArray(data) ? data : []);
        setStatus("success");
      } catch (loadError) {
        if (!isMounted) return;
        console.error("Failed to load offers", loadError);
        setStatus("error");
        setError(
          loadError?.response?.data?.message ||
            loadError?.message ||
            "Failed to load offers"
        );
      }
    };

    loadOffers();

    return () => {
      isMounted = false;
    };
  }, []);

  const visibleOffers = useMemo(
    () => offers.filter((offer) => offer?.showOnOffersPage !== false),
    [offers]
  );

  return (
    <div className="min-h-[60vh] bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 shadow-sm">
              <Sparkles size={14} /> Storefront offers
            </div>
            <h1 className="mt-3 hidden text-3xl font-bold text-slate-900 sm:block md:text-4xl">
              Current promotions &amp; perks
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm text-slate-500 sm:block md:text-base">
              Explore every live offer available right now. Each lightbox below
              mirrors exactly what shoppers see on the homepage.
            </p>
          </div>
        </div>

        <div className="mt-10">
          {status === "loading" ? (
            <div className="flex justify-center py-20">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading offers…
              </span>
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-white px-6 py-8 text-center text-rose-600 shadow-sm">
              {error}
            </div>
          ) : visibleOffers.length ? (
            <motion.div layout className="grid gap-6 md:grid-cols-2">
              {visibleOffers.map((offer) => (
                <OfferLightboxCard key={offer._id} offer={offer} />
              ))}
            </motion.div>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-slate-500 shadow-sm">
              No active offers right now. Check back soon!
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OffersPage;
