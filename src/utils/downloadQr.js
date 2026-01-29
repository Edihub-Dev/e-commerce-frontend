import jsPDF from "jspdf";

const fetchImageData = async (url) => {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error("Failed to load QR code image");
  }

  const blob = await response.blob();
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  const dimensions = await new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = reject;
    image.src = dataUrl;
  });

  const mime = blob.type || "";
  let format = "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg")) {
    format = "JPEG";
  } else if (mime.includes("webp")) {
    format = "WEBP";
  }

  return { dataUrl, format, dimensions };
};

const sanitizeFilename = (value) =>
  String(value || "qr-code")
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");

export const downloadQrAsPdf = async ({
  qrUrl,
  orderId,
  filePrefix = "qr-code",
  title,
  includeTitle = false,
  returnDataUri = false,
}) => {
  if (!qrUrl) {
    throw new Error("QR code not available for this order");
  }

  const { dataUrl, format, dimensions } = await fetchImageData(qrUrl);

  const dpiScale = 0.75; // approximate px -> pt conversion (96dpi)
  const baseWidth = dimensions?.width ? dimensions.width * dpiScale : 320;
  const baseHeight = dimensions?.height
    ? dimensions.height * dpiScale
    : baseWidth;

  const maxSize = 420;
  const minSize = 240;

  const targetWidth = Math.min(Math.max(baseWidth, minSize), maxSize);
  const aspectRatio =
    dimensions?.width && dimensions?.height
      ? dimensions.width / dimensions.height
      : 1;
  const targetHeight = aspectRatio
    ? targetWidth / aspectRatio
    : Math.min(Math.max(baseHeight, minSize), maxSize);

  const margin = 12;
  const titleHeight = title && includeTitle ? 36 : 0;
  const pageWidth = targetWidth + margin * 2;
  const pageHeight = targetHeight + margin * 2 + titleHeight;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: [pageWidth, pageHeight],
  });

  if (titleHeight) {
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.text(String(title), pageWidth / 2, margin + 6, { align: "center" });
  }

  const imageX = (pageWidth - targetWidth) / 2;
  const imageY = margin + titleHeight;
  doc.addImage(
    dataUrl,
    format || "PNG",
    imageX,
    imageY,
    targetWidth,
    targetHeight,
  );

  const filenameSuffix = sanitizeFilename(orderId || Date.now());
  const filenamePrefix = sanitizeFilename(filePrefix) || "qr-code";
  const filename = `${filenamePrefix}-${filenameSuffix || "qr"}.pdf`;

  if (returnDataUri) {
    return doc.output("datauristring");
  }

  doc.save(filename);
};
