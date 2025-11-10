import React, { useEffect, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { ChevronRight } from "lucide-react";

const slides = [
  {
    superTitle: "Best Deal Online MST Blockchain Official Polo T-Shirt",
    title: "T-SHIRT",
    subTitle: "UP to 80% OFF",
    image: "/assets/products/WHITE_FRONT.png",
  },
  {
    superTitle: "Latest Collection of MST Blockchain Official Polo T-Shirt",
    title: "NEW ARRIVALS",
    subTitle: "Starting from ₹799",
    image: "/assets/products/WHITE_BACK.png",
  },
];

const BackgroundRemovedImage = ({ src, threshold = 240, ...props }) => {
  const [processedSrc, setProcessedSrc] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (!isMounted) return;
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const context = canvas.getContext("2d");
      if (!context) {
        setProcessedSrc(src);
        return;
      }

      context.drawImage(img, 0, 0);
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const { data } = imageData;

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];

        if (red >= threshold && green >= threshold && blue >= threshold) {
          data[index + 3] = 0;
        }
      }

      context.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL("image/png"));
    };

    img.onerror = () => {
      if (isMounted) {
        setProcessedSrc(src);
      }
    };

    return () => {
      isMounted = false;
    };
  }, [src, threshold]);

  return <img src={processedSrc || src} alt="" {...props} />;
};

const HeroCarousel = () => {
  return (
    <div className="container mx-auto px-4 mt-8">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        loop={true}
        autoplay={{
          delay: 5000,
          disableOnInteraction: false,
          reverseDirection: false,
        }}
        className="rounded-lg hero-slider"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index} className="bg-secondary rounded-lg">
            <div className="flex flex-col md:flex-row items-center justify-between p-8 md:p-16 h-[500px] md:h-[316px]">
              <div className="text-white text-center md:text-left z-10 mb-8 md:mb-0">
                <p className="text-lg md:text-2xl font-semibold">
                  {slide.superTitle}
                </p>
                <h1 className="text-4xl md:text-6xl font-bold my-4">
                  {slide.title}
                </h1>
                <p className="text-lg md:text-2xl font-semibold">
                  {slide.subTitle}
                </p>
                <button className="mt-6 bg-primary text-white font-bold py-3 px-6 rounded-md hover:bg-primary-dark transition-colors flex items-center mx-auto md:mx-0">
                  Shop Now <ChevronRight size={20} className="ml-2" />
                </button>
              </div>
              <div className="relative w-full md:w-1/2 h-full flex items-center justify-center">
                <BackgroundRemovedImage
                  src={slide.image}
                  alt={slide.title}
                  className="max-h-full max-w-full object-contain z-10"
                />
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default HeroCarousel;
