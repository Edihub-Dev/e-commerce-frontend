import React, { useState, useEffect, useMemo } from "react";
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

  const canonicalPath = slug
    ? `/category/${encodeURIComponent(slug)}`
    : undefined;

  const seoMeta = useMemo(() => {
    const readableTitle = categoryTitle || fallbackName || "Custom Merchandise";
    const normalizedTitle = readableTitle.replace(/\s+/g, " ").trim();
    const sentenceCaseTitle = normalizedTitle
      ? normalizedTitle.charAt(0).toUpperCase() + normalizedTitle.slice(1)
      : "Custom Merchandise";
    const pageTitle = `${sentenceCaseTitle} | Custom ${sentenceCaseTitle} Online | p2pdeal`;
    const description = `Order personalized ${sentenceCaseTitle} with your logo or artwork at p2pdeal. Premium materials, bulk-friendly pricing, and PAN-India delivery for events, teams, and corporate gifting.`;
    const keywords = [
      sentenceCaseTitle,
      `${sentenceCaseTitle} custom printing`,
      `${sentenceCaseTitle} bulk order`,
      "p2pdeal",
      "corporate gifts",
      "custom merchandise",
    ];

    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://shop.p2pdeal.net/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: sentenceCaseTitle,
          item: canonicalPath
            ? `https://shop.p2pdeal.net${canonicalPath}`
            : undefined,
        },
      ].filter((item) => Boolean(item.item)),
    };

    const itemListSchema = products.length
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: products.slice(0, 12).map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: product?.name || "Product",
            url: product?.id
              ? `https://shop.p2pdeal.net/product/${encodeURIComponent(
                  product.id
                )}`
              : undefined,
          })),
        }
      : null;

    const schema = itemListSchema
      ? [breadcrumbSchema, itemListSchema]
      : [breadcrumbSchema];

    return {
      title: pageTitle,
      description,
      keywords,
      schema,
    };
  }, [categoryTitle, fallbackName, canonicalPath, products]);

  return (
    <>
      <SeoHead
        title={seoMeta.title}
        description={seoMeta.description}
        keywords={seoMeta.keywords}
        canonicalPath={canonicalPath}
        openGraph={{
          title: seoMeta.title,
          description: seoMeta.description,
        }}
        schema={seoMeta.schema}
      />
      <motion.div
        className="container mx-auto px-4 py-8"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
      >
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
    </>
  );
};

export default CategoryPage;
