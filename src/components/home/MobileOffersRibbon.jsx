import React from "react";
import { Percent } from "lucide-react";
import { Link } from "react-router-dom";

const MobileOffersRibbon = () => (
  <div className="md:hidden fixed bottom-24 right-4 z-40">
    <Link
      to="/offers"
      className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/95 px-3 py-2 text-[#008ECC] shadow-lg backdrop-blur-sm"
    >
      <span className="grid h-7 w-7 place-items-center rounded-full bg-[#E0F2FF] text-[#008ECC]">
        <Percent className="h-3.5 w-3.5" />
      </span>
      <span className="text-xs font-semibold">All Offers</span>
    </Link>
  </div>
);

export default MobileOffersRibbon;
