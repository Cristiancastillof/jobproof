import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { calculateTotalHours } from "./calculateTotalHours";

const PAGE_MARGIN = 14;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const HEADER_HEIGHT = 24;
const FOOTER_HEIGHT = 16;
const TOP_CONTENT_Y = 34;
const BOTTOM_LIMIT = PAGE_HEIGHT - FOOTER_HEIGHT - 8;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const JP_NAVY = [15, 23, 42];
const JP_BLUE = [30, 64, 175];
const JP_AMBER = [245, 158, 11];
const JP_SLATE = [100, 116, 139];
const JP_LIGHT = [248, 250, 252];
const JP_BORDER = [203, 213, 225];

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

  return cleaned || "file";
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

const addImageSafely = async (pdf, imageSrc, x, y, maxWidth, maxHeight) => {
  if (!imageSrc) return false;

  try {
    const img = await loadImage(imageSrc);

    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

    const renderWidth = img.width * ratio;
    const renderHeight = img.height * ratio;

    pdf.addImage(
      imageSrc,
      getImageFormat(imageSrc),
      x,
      y,
      renderWidth,
      renderHeight
    );

    return true;
  } catch (error) {
    console.error("Image could not be added:", error);
    return false;
  }
};

const addHeader = async (pdf, reportData) => {
  pdf.setFillColor(...JP_NAVY);
  pdf.rect(0, 0, PAGE_WIDTH, HEADER_HEIGHT, "F");

  pdf.setFillColor(...JP_AMBER);
  pdf.rect(0, HEADER_HEIGHT - 2, PAGE_WIDTH, 2, "F");

  let textX = PAGE_MARGIN;

  if (reportData.businessLogo) {
    const logoAdded = await addImageSafely(
      pdf,
      reportData.businessLogo,
      PAGE_MARGIN,
      5,
      14,
      14
    );

    if (logoAdded) {
      textX = PAGE_MARGIN + 18;
    }
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(reportData.businessName || "JobProof", textX, 10.5);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.5);

  const contactDetails = [reportData.businessEmail, reportData.businessPhone]
    .filter(Boolean)
    .join(" | ");

  if (contactDetails) {
    pdf.text(contactDetails, textX, 16.8);
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);

  const headerRightText = reportData.reportNumber
    ? `JOB REPORT  |  ${reportData.reportNumber}`
    : "JOB REPORT";

  pdf.text(headerRightText, PAGE_WIDTH - PAGE_MARGIN, 10.8, {
    align: "right",
  });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(226, 232, 240);

  pdf.text("Generated with JobProof", PAGE_WIDTH - PAGE_MARGIN, 16.8, {
    align: "right",
  });
};

const addFooter = (pdf, pageNumber) => {
  pdf.setDrawColor(...JP_BORDER);
  pdf.line(
    PAGE_MARGIN,
    PAGE_HEIGHT - 14,
    PAGE_WIDTH - PAGE_MARGIN,
    PAGE_HEIGHT - 14
  );

  pdf.setFillColor(...JP_AMBER);
  pdf.rect(PAGE_MARGIN, PAGE_HEIGHT - 14.8, 18, 1.2, "F");

  pdf.setTextColor(...JP_SLATE);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);

  pdf.text("JobProof - Professional job reports", PAGE_MARGIN, PAGE_HEIGHT - 8);

  pdf.text(`Page ${pageNumber}`, PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 8, {
    align: "right",
  });
};

const setupPage = async (pdf, reportData, pageNumber) => {
  await addHeader(pdf, reportData);
  addFooter(pdf, pageNumber);
};

const addNewPage = async (pdf, reportData, pageNumberRef) => {
  pdf.addPage();
  pageNumberRef.value += 1;
  await setupPage(pdf, reportData, pageNumberRef.value);

  return TOP_CONTENT_Y;
};

const addSectionTitle = (pdf, title, y) => {
  pdf.setTextColor(...JP_NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.text(title, PAGE_MARGIN, y);

  pdf.setDrawColor(...JP_BORDER);
  pdf.line(PAGE_MARGIN, y + 3, PAGE_WIDTH - PAGE_MARGIN, y + 3);

  pdf.setFillColor(...JP_AMBER);
  pdf.rect(PAGE_MARGIN, y + 2.4, 14, 1.2, "F");

  return y + 10;
};

const addTextSection = async (
  pdf,
  title,
  content,
  y,
  reportData,
  pageNumberRef
) => {
  const safeContent = content?.trim() || "Not provided";

  if (y > BOTTOM_LIMIT - 25) {
    y = await addNewPage(pdf, reportData, pageNumberRef);
  }

  y = addSectionTitle(pdf, title, y);

  pdf.setTextColor(55, 65, 81);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);

  const lines = pdf.splitTextToSize(safeContent, CONTENT_WIDTH);
  const lineHeight = 5;
  const textHeight = lines.length * lineHeight;

  if (y + textHeight > BOTTOM_LIMIT) {
    y = await addNewPage(pdf, reportData, pageNumberRef);
    y = addSectionTitle(pdf, title, y);
  }

  pdf.text(lines, PAGE_MARGIN, y);

  return y + textHeight + 8;
};

const addPhotoCard = async (pdf, photo, x, y, width, height, caption) => {
  pdf.setFillColor(...JP_LIGHT);
  pdf.setDrawColor(...JP_BORDER);
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
    pdf.setTextColor(...JP_SLATE);
    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(9);
    pdf.text("Image unavailable", x + width / 2, y + height / 2, {
      align: "center",
    });
  }

  pdf.setTextColor(...JP_NAVY);
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
    y = await addNewPage(pdf, reportData, pageNumberRef);
  }

  y = addSectionTitle(pdf, title, y);

  if (!photos || photos.length === 0) {
    pdf.setTextColor(...JP_SLATE);
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
      y = await addNewPage(pdf, reportData, pageNumberRef);
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
    reportNumber: reportData.reportNumber || "Draft",
    businessName: reportData.businessName || "",
    businessEmail: reportData.businessEmail || "",
    businessPhone: reportData.businessPhone || "",
    businessLogo: reportData.businessLogo || "",
    workerName: reportData.workerName || "",
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

  await setupPage(pdf, currentReportData, pageNumberRef.value);

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
      textColor: JP_NAVY,
      lineColor: JP_BORDER,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: JP_BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: JP_LIGHT,
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
        "Report No.",
        currentReportData.reportNumber || "Draft",
        "Generated",
        formatDate(new Date().toISOString()),
      ],
      [
        "Business",
        currentReportData.businessName || "Not provided",
        "Client",
        currentReportData.clientName || "Not provided",
      ],
      [
        "Business Email",
        currentReportData.businessEmail || "Not provided",
        "Business Phone",
        currentReportData.businessPhone || "Not provided",
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
        "Completed By",
        currentReportData.workerName || "Not provided",
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

  y = await addTextSection(
    pdf,
    "Work Completed",
    currentReportData.workCompleted,
    y,
    currentReportData,
    pageNumberRef
  );

  y = await addTextSection(
    pdf,
    "Issues Found",
    currentReportData.issuesFound,
    y,
    currentReportData,
    pageNumberRef
  );

  y = await addTextSection(
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

  const reportNumber =
    currentReportData.reportNumber && currentReportData.reportNumber !== "Draft"
      ? cleanFileName(currentReportData.reportNumber)
      : "draft-report";

  const clientName = currentReportData.clientName
    ? cleanFileName(currentReportData.clientName)
    : "client";

  const uniqueId = new Date().toISOString().replace(/[:.]/g, "-");

  const fileName = `${reportNumber}-${clientName}-${uniqueId}-jobproof-report.pdf`;

  pdf.save(fileName);
};