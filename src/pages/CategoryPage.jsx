import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import ProductCard from "../components/ProductCard";
import { getProductsByCategory, getProductsByBrand } from "../utils/api";
import { pageVariants } from "../utils/animations";
import SeoHead from "../components/seo/SeoHead";

const CategoryPage = () => {
  const { slug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  let fallbackName = "";
  try {
    fallbackName = decodeURIComponent(slug || "");
  } catch (_error) {
    fallbackName = slug || "";
  }
  fallbackName = fallbackName
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const [categoryTitle, setCategoryTitle] = useState(fallbackName);

  useEffect(() => {
    let active = true;

    const fetchCategoryProducts = async () => {
      setLoading(true);
      try {
        let productsToShow = [];

        const categoryResponse = await getProductsByCategory(slug, {
          limit: "all",
        });
        productsToShow = categoryResponse.data;

        if (!productsToShow.length) {
          const brandResponse = await getProductsByBrand(slug, {
            limit: "all",
          });
          productsToShow = brandResponse.data;
        }

        if (active) {
          setProducts(productsToShow);
          const nameFromProduct = productsToShow.find(
            (item) => item?.category
          )?.category;
          const brandFromProduct = productsToShow.find(
            (item) => item?.brand
          )?.brand;
          const resolvedTitle = (
            nameFromProduct ||
            brandFromProduct ||
            fallbackName ||
            ""
          )
            .toString()
            .trim();
          setCategoryTitle(resolvedTitle);
          setError("");
        }
      } catch (err) {
        console.error("Failed to load category products", err);
        if (active) {
          setError(err.message || "Unable to load products for this category.");
          setProducts([]);
          setCategoryTitle(fallbackName);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchCategoryProducts();

    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <motion.div
      className="container mx-auto px-4 py-8"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <SeoHead
        title={`Category: ${categoryTitle} | MST Blockchain Merchandise | Crypto Merchandise & Blockchain Merch India`}
        description={`Shop ${categoryTitle} from MST Blockchain official merchandise including blockchain official polo t-shirt (white edition, yellow edition, blue edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain executive diary + pen set, blockchain white logo cap and blockchain premium metal keychain.`}
        keywords="crypto merchandise, blockchain merch india, mst merch india, blockchain official polo t-shirt (white edition), blockchain official polo t-shirt (yellow edition), blockchain official polo t-shirt (blue edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain executive diary + pen set, blockchain white logo cap, blockchain premium metal keychain, blockchain premium metal avenger keychain, blockchain premium metal spider keychain, blockchain premium metal spartan keychain, blockchain premium metal legend keychain, blockchain premium metal warrior keychain, best price blockchain official polo t-shirt (white edition) india, blockchain official polo t-shirt (white edition) under budget, affordable blockchain official polo t-shirt (white edition) online, best price blockchain ceramic coffee mug india, blockchain ceramic coffee mug under budget, affordable blockchain ceramic coffee mug online"
        canonicalPath={`/category/${slug}`}
        openGraph={{
          title: `Category: ${categoryTitle} | MST Blockchain Merchandise`,
          description: `Browse ${categoryTitle} in MST Blockchain crypto merchandise and blockchain merch india, including blockchain official polo t-shirt (white edition, yellow edition, blue edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain executive diary + pen set, blockchain white logo cap and blockchain premium metal keychain.`,
          type: "website",
        }}
        twitter={{
          title: `Category: ${categoryTitle} | MST Blockchain Merchandise`,
          description: `Shop ${categoryTitle} from mst merch india featuring blockchain official polo t-shirt (white edition), blockchain ceramic coffee mug, blockchain executive diary, blockchain executive pen, blockchain white logo cap and blockchain premium metal keychain at the best price in India.`,
        }}
      />
      <motion.h1
        className="text-3xl font-bold mb-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        Category: {categoryTitle}
      </motion.h1>
      {loading && (
        <div className="py-6 text-center text-sm text-slate-500">
          Loading category products...
        </div>
      )}
      {error && !loading && (
        <div className="py-6 text-center text-sm text-red-500">{error}</div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="py-6 text-center text-sm text-slate-500">
          No products found in this category yet.
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </motion.div>
  );
};

export default CategoryPage;
