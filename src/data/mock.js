import { faker } from "@faker-js/faker";

const generateProduct = (category, brand) => {
  const price = faker.commerce.price({ min: 100, max: 2000, dec: 0 });
  const originalPrice = (
    parseFloat(price) * faker.number.float({ min: 1.2, max: 2.5 })
  ).toFixed(0);
  const discount = Math.round(((originalPrice - price) / originalPrice) * 100);

  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: parseFloat(price),
    originalPrice: parseFloat(originalPrice),
    discount,
    saveAmount: (originalPrice - price).toFixed(0),
    image: `https://picsum.photos/seed/${faker.string.alphanumeric(5)}/400/400`,
    category: category || faker.commerce.department(),
    brand: brand || faker.company.name(),
    rating: faker.number.float({ min: 3.5, max: 5, precision: 0.1 }),
    reviews: faker.number.int({ min: 10, max: 500 }),
  };
};

// Helper function to calculate price and saveAmount from originalPrice and discount
const createProduct = (
  id,
  name,
  description,
  originalPrice,
  discount,
  image,
  brand,
  rating,
  reviews
) => {
  const price = Math.round(originalPrice * (1 - discount / 100));
  const saveAmount = originalPrice - price;

  return {
    id,
    name,
    description,
    price,
    originalPrice,
    discount,
    saveAmount,
    image,
    category: "MST Blockchain Official Polo T-Shirt",
    brand,
    rating,
    reviews,
  };
};

export const merchDeals = [
  createProduct(
    "1",
    "MST Blockchain Official Polo T-Shirt (White Edition)",
    // "Premium white polo with embroidered MST crest, perfect for community events",
    "Show your pride in the MST Blockchain community with this premium white polo t-shirt — crafted for comfort, style, and durability. Designed with a sleek printed MST logo, this shirt blends casual elegance with professional appeal. Whether you’re attending a blockchain event, trading from your desk, or relaxing on the weekend, this polo is your go-to merch.",
    2, // originalPrice
    20, // discount %
    "/assets/products/WHITE_FRONT.png",
    "MST Blockchain Official Polo T-Shirt",
    4.5,
    24
  ),
  createProduct(
    "2",
    "MST Blockchain Official Polo T-Shirt (White Edition)",
    // "Lightweight everyday polo designed for all-day comfort at meetups",
    "Show your pride in the MST Blockchain community with this premium white polo t-shirt — crafted for comfort, style, and durability. Designed with a sleek printed MST logo, this shirt blends casual elegance with professional appeal. Whether you’re attending a blockchain event, trading from your desk, or relaxing on the weekend, this polo is your go-to merch.",
    999, // originalPrice
    20, // discount %
    "/assets/products/WHITE_BACK.png",
    "MST Blockchain Official Polo T-Shirt",
    4.2,
    180
  ),
  createProduct(
    "3",
    "MST Blockchain Official Polo T-Shirt (White Edition)",
    // "Performance stretch polo built for long hackathon sessions",
    "Show your pride in the MST Blockchain community with this premium white polo t-shirt — crafted for comfort, style, and durability. Designed with a sleek printed MST logo, this shirt blends casual elegance with professional appeal. Whether you’re attending a blockchain event, trading from your desk, or relaxing on the weekend, this polo is your go-to merch.",
    999, // originalPrice
    20, // discount %
    "/assets/products/WHITE_MODEL_2.png",
    "MST Blockchain Official Polo T-Shirt",
    4.3,
    210
  ),
  createProduct(
    "4",
    "MST Blockchain Official Polo T-Shirt (White Edition)",
    // "Limited-run collectors polo featuring premium contrast piping",
    "Show your pride in the MST Blockchain community with this premium white polo t-shirt — crafted for comfort, style, and durability. Designed with a sleek printed MST logo, this shirt blends casual elegance with professional appeal. Whether you’re attending a blockchain event, trading from your desk, or relaxing on the weekend, this polo is your go-to merch.",
    999, // originalPrice
    20, // discount %
    "/assets/products/WHITE_MODEL.png",
    "MST Blockchain Official Polo T-Shirt",
    4.4,
    195
  ),
  // createProduct(
  //   "5",
  //   "MST Blockchain Official Polo T-Shirt (White Edition)",
  //   "Latest iPhone with Dynamic Island",
  //   90000, // originalPrice
  //   14, // discount %
  //   "/assets/products/galexy s22 ultra.png",
  //   "Apple",
  //   4.8,
  //   320
  // ),
];

export const topCategories = [
  {
    name: "Mobile",
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Cosmetics",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Electronics",
    image:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Furniture",
    image:
      "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Watches",
    image:
      "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Decor",
    image:
      "https://images.unsplash.com/photo-1505691723518-36a5ac3be353?auto=format&fit=crop&w=400&q=80",
  },
  {
    name: "Accessories",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=400&q=80",
  },
];

export const topBrands = [
  {
    name: "Apple",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    bgColor: "#313131",
    textColor: "#FFFFFF",
  },
  {
    name: "Realme",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/2/22/Realme_logo.png",
    bgColor: "#FFF3CC",
    textColor: "#222222",
  },
  {
    name: "Xiaomi",
    image:
      "https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg",
    bgColor: "#FFECDF",
    textColor: "#222222",
  },
];

export const dailyEssentials = [
  {
    name: "Daily Essentials",
    image:
      "https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
  {
    name: "Vegetables",
    image:
      "https://images.unsplash.com/photo-1441123285228-1448e608f3d5?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
  {
    name: "Fruits",
    image:
      "https://images.unsplash.com/photo-1574226516831-e1dff420e43e?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
  {
    name: "Strawberry",
    image:
      "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
  {
    name: "Mango",
    image:
      "https://images.unsplash.com/photo-1523475472560-d2df97ec485c?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
  {
    name: "Cherry",
    image:
      "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80",
    discount: 50,
  },
];

export const generateProducts = (count = 20) => {
  return Array.from({ length: count }, () => generateProduct());
};

export const allProducts = merchDeals;
