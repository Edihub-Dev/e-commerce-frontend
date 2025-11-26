import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const SectionHeader = ({ title, linkTo, linkText = "View All" }) => {
  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h2 className="text-2xl font-bold text-dark-text">{title}</h2>
        <div
          className=" h-1.5 mt-2"
          style={{ backgroundColor: "#008ECC" }}
        ></div>
      </div>
      {linkTo && (
        <Link
          to={linkTo}
          className="hidden items-center font-semibold hover:underline sm:flex"
        >
          <span style={{ color: "#000000" }}>{linkText}</span>
          <ChevronRight size={20} className="ml-1 text-primary" />
        </Link>
      )}
    </div>
  );
};

export default SectionHeader;
