import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { calculateTotalHours } from "./calculateTotalHours";

const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const HEADER_HEIGHT = 20;
const FOOTER_HEIGHT = 16;
const TOP_CONTENT_Y = 30;
const BOTTOM_LIMIT = PAGE_HEIGHT - FOOTER_HEIGHT - 8;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const formatDate = (dateString) => {
  if (!dateString) return "Not provided";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return dateString;

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (timeString) => {
  if (!timeString) return "Not provided";

  const [hours, minutes] = timeString.split(":");

  if (!hours || !minutes) return timeString;

  return `${hours}:${minutes}`;
};

const cleanFileName = (value) => {
  const cleaned = value
    ?.trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();

  return cleaned || "client";
};

const getImageFormat = (src) => {
  if (src?.startsWith("data:image/png")) return "PNG";
  return "JPEG";
};

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Image could not be loaded"));

    img.src = src;
  });
};

const addHeader = (pdf, reportData) => {
  pdf.setFillColor(13, 110, 253);
  pdf.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(reportData.businessName || "JobProof", PAGE_MARGIN, 12);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text("Professional Job Report", PAGE_WIDTH - PAGE_MARGIN, 12, {
    align: "right",
  });
};

const addFooter = (pdf, pageNumber) => {
  pdf.setDrawColor(220, 226, 232);
  pdf.line(
    PAGE_MARGIN,
    PAGE_HEIGHT - 14,
    PAGE_WIDTH - PAGE_MARGIN,
    PAGE_HEIGHT - 14
  );

  pdf.setTextColor(100, 116, 139);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text("Generated with JobProof", PAGE_MARGIN, PAGE_HEIGHT - 8);

  pdf.text(`Page ${pageNumber}`, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 8, {
    align: "right",
  });
};

const setupPage = (pdf, reportData, pageNumber) => {
  addHeader(pdf, reportData);
  addFooter(pdf, pageNumber);
};

const addNewPage = (pdf, reportData, pageNumberRef) => {
  pdf.addPage();
  pageNumberRef.value += 1;
  setupPage(pdf, reportData, pageNumberRef.value);

  return TOP_CONTENT_Y;
};

const addSectionTitle = (pdf, title, y) => {
  pdf.setTextColor(17, 24, 39);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, PAGE_MARGIN, y);

  pdf.setDrawColor(220, 226, 232);
  pdf.line(PAGE_MARGIN, y + 3, PAGE_WIDTH - PAGE_MARGIN, y + 3);

  return y + 10;
};

const addTextSection = (pdf, title, content, y, reportData, pageNumberRef) => {
  const safeContent = content?.trim() || "Not provided";

  if (y > BOTTOM_LIMIT - 25) {
    y = addNewPage(pdf, reportData, pageNumberRef);
  }

  y = addSectionTitle(pdf, title, y);

  pdf.setTextColor(55, 65, 81);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const lines = pdf.splitTextToSize(safeContent, CONTENT_WIDTH);
  const lineHeight = 5;
  const textHeight = lines.length * lineHeight;

  if (y + textHeight > BOTTOM_LIMIT) {
    y = addNewPage(pdf, reportData, pageNumberRef);
    y = addSectionTitle(pdf, title, y);
  }

  pdf.text(lines, PAGE_MARGIN, y);

  return y + textHeight + 8;
};

const addPhotoCard = async (pdf, photo, x, y, width, height, caption) => {
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(220, 226, 232);
  pdf.roundedRect(x, y, width, height, 2, 2, "FD");

  try {
    const img = await loadImage(photo);

    const imageAreaPadding = 3;
    const maxImageWidth = width - imageAreaPadding * 2;
    const maxImageHeight = height - 14;

    const ratio = Math.min(
      maxImageWidth / img.width,
      maxImageHeight / img.height
    );

    const renderWidth = img.width * ratio;
    const renderHeight = img.height * ratio;

    const renderX = x + (width - renderWidth) / 2;
    const renderY = y + imageAreaPadding + (maxImageHeight - renderHeight) / 2;

    pdf.addImage(
      photo,
      getImageFormat(photo),
      renderX,
      renderY,
      renderWidth,
      renderHeight
    );
  } catch (error) {
    pdf.setTextColor(120, 120, 120);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.text("Image unavailable", x + width / 2, y + height / 2, {
      align: "center",
    });
  }

  pdf.setTextColor(55, 65, 81);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8.5);
  pdf.text(caption, x + 3, y + height - 5);
};

const addPhotoSection = async (
  pdf,
  title,
  photos,
  y,
  reportData,
  pageNumberRef
) => {
  if (y > BOTTOM_LIMIT - 35) {
    y = addNewPage(pdf, reportData, pageNumberRef);
  }

  y = addSectionTitle(pdf, title, y);

  if (!photos || photos.length === 0) {
    pdf.setTextColor(107, 114, 128);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text("No photos attached.", PAGE_MARGIN, y);

    return y + 10;
  }

  const gap = 8;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cardHeight = 72;
  const rowHeight = cardHeight + 8;

  for (let index = 0; index < photos.length; index += 2) {
    if (y + rowHeight > BOTTOM_LIMIT) {
      y = addNewPage(pdf, reportData, pageNumberRef);
      y = addSectionTitle(pdf, `${title} continued`, y);
    }

    const firstPhoto = photos[index];
    const secondPhoto = photos[index + 1];

    await addPhotoCard(
      pdf,
      firstPhoto,
      PAGE_MARGIN,
      y,
      cardWidth,
      cardHeight,
      `${title} - Photo ${index + 1}`
    );

    if (secondPhoto) {
      await addPhotoCard(
        pdf,
        secondPhoto,
        PAGE_MARGIN + cardWidth + gap,
        y,
        cardWidth,
        cardHeight,
        `${title} - Photo ${index + 2}`
      );
    }

    y += rowHeight;
  }

  return y + 4;
};

export const generatePDF = async (reportData) => {
  const calculatedTotalHours =
    reportData.totalHours ||
    calculateTotalHours(reportData.startingHour, reportData.finishHour);

  const currentReportData = {
    businessName: reportData.businessName || "",
    clientName: reportData.clientName || "",
    jobAddress: reportData.jobAddress || "",
    jobDate: reportData.jobDate || "",
    startingHour: reportData.startingHour || "",
    finishHour: reportData.finishHour || "",
    totalHours: calculatedTotalHours || "",
    serviceType: reportData.serviceType || "",
    workCompleted: reportData.workCompleted || "",
    issuesFound: reportData.issuesFound || "",
    recommendations: reportData.recommendations || "",
    beforePhotos: reportData.beforePhotos || [],
    afterPhotos: reportData.afterPhotos || [],
  };

  const pdf = new jsPDF("p", "mm", "a4");

  const pageNumberRef = {
    value: 1,
  };

  setupPage(pdf, currentReportData, pageNumberRef.value);

  let y = TOP_CONTENT_Y;

  autoTable(pdf, {
    startY: y,
    margin: {
      left: PAGE_MARGIN,
      right: PAGE_MARGIN,
    },
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      textColor: [31, 41, 55],
      lineColor: [220, 226, 232],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [13, 110, 253],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    columnStyles: {
      0: {
        cellWidth: 36,
        fontStyle: "bold",
      },
      1: {
        cellWidth: 56,
      },
      2: {
        cellWidth: 36,
        fontStyle: "bold",
      },
      3: {
        cellWidth: 56,
      },
    },
    head: [["Client & Job Information", "", "Report Details", ""]],
    body: [
      [
        "Business",
        currentReportData.businessName || "Not provided",
        "Client",
        currentReportData.clientName || "Not provided",
      ],
      [
        "Address",
        currentReportData.jobAddress || "Not provided",
        "Job Date",
        formatDate(currentReportData.jobDate),
      ],
      [
        "Service Type",
        currentReportData.serviceType || "Not provided",
        "Generated",
        formatDate(new Date().toISOString()),
      ],
      [
        "Start Time",
        formatTime(currentReportData.startingHour),
        "Finish Time",
        formatTime(currentReportData.finishHour),
      ],
      [
        "Total Hours",
        currentReportData.totalHours || "Not provided",
        "",
        "",
      ],
    ],
  });

  y = pdf.lastAutoTable.finalY + 10;

  y = addTextSection(
    pdf,
    "Work Completed",
    currentReportData.workCompleted,
    y,
    currentReportData,
    pageNumberRef
  );

  y = addTextSection(
    pdf,
    "Issues Found",
    currentReportData.issuesFound,
    y,
    currentReportData,
    pageNumberRef
  );

  y = addTextSection(
    pdf,
    "Recommendations",
    currentReportData.recommendations,
    y,
    currentReportData,
    pageNumberRef
  );

  y = await addPhotoSection(
    pdf,
    "Before Photos",
    currentReportData.beforePhotos,
    y,
    currentReportData,
    pageNumberRef
  );

  await addPhotoSection(
    pdf,
    "After Photos",
    currentReportData.afterPhotos,
    y,
    currentReportData,
    pageNumberRef
  );

  const clientName = currentReportData.clientName || "client";
  const uniqueId = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${cleanFileName(clientName)}-${uniqueId}-jobproof-report.pdf`;

  pdf.save(fileName);
};