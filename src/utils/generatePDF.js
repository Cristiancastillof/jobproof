import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;

const BRAND = {
  navy: [15, 23, 42],
  blue: [30, 64, 175],
  amber: [245, 158, 11],
  lightBg: [248, 250, 252],
  border: [226, 232, 240],
  muted: [100, 116, 139],
  white: [255, 255, 255],
  green: [22, 101, 52],
  greenBg: [220, 252, 231],
  yellow: [146, 64, 14],
  yellowBg: [254, 243, 199],
  blueBg: [219, 234, 254],
};

const formatDate = (dateValue) => {
  if (!dateValue) return "Not provided";

  const date = new Date(`${dateValue}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return date.toLocaleDateString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatValue = (value, fallback = "Not provided") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const getStatusLabel = (status) => {
  if (status === "pending") return "Pending";
  if (status === "checked") return "Checked";
  if (status === "completed") return "Completed";
  return "Pending";
};

const getStatusStyle = (status) => {
  if (status === "completed") {
    return {
      bg: BRAND.greenBg,
      text: BRAND.green,
      border: [34, 197, 94],
    };
  }

  if (status === "checked") {
    return {
      bg: BRAND.blueBg,
      text: BRAND.blue,
      border: [30, 64, 175],
    };
  }

  return {
    bg: BRAND.yellowBg,
    text: BRAND.yellow,
    border: BRAND.amber,
  };
};

const getRoleLabel = (roleOnJob, role) => {
  if (roleOnJob === "lead") return "Lead";
  if (roleOnJob === "supervisor") return "Supervisor";
  if (roleOnJob === "helper") return "Helper";

  if (role === "admin") return "Admin";
  if (role === "supervisor") return "Supervisor";

  return "Worker";
};

const loadImage = (src) => {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";

    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);

    image.src = src;
  });
};

const getImageDimensions = (image, maxWidth, maxHeight) => {
  const ratio = Math.min(maxWidth / image.width, maxHeight / image.height);

  return {
    width: image.width * ratio,
    height: image.height * ratio,
  };
};

const addFooter = (doc, pageNumber) => {
  doc.setDrawColor(...BRAND.border);
  doc.line(MARGIN, PAGE_HEIGHT - 14, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.muted);
  doc.text("Generated with JobProof", MARGIN, PAGE_HEIGHT - 8);

  doc.text(`Page ${pageNumber}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, {
    align: "right",
  });
};

const addPageIfNeeded = (doc, currentY, requiredSpace = 30) => {
  if (currentY + requiredSpace <= PAGE_HEIGHT - 22) {
    return currentY;
  }

  doc.addPage();
  addFooter(doc, doc.getNumberOfPages());

  return 20;
};

const addSectionTitle = (doc, title, y) => {
  const nextY = addPageIfNeeded(doc, y, 18);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...BRAND.navy);
  doc.text(title, MARGIN, nextY);

  doc.setDrawColor(...BRAND.amber);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, nextY + 3, MARGIN + 26, nextY + 3);

  return nextY + 10;
};

const addStatusBadge = (doc, reportData, x, y) => {
  const status = reportData.status || "pending";
  const label = getStatusLabel(status);
  const style = getStatusStyle(status);

  const badgeWidth = Math.max(36, doc.getTextWidth(label) + 18);
  const badgeHeight = 8;

  doc.setFillColor(...style.bg);
  doc.setDrawColor(...style.border);
  doc.roundedRect(x, y, badgeWidth, badgeHeight, 4, 4, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...style.text);
  doc.text(label, x + badgeWidth / 2, y + 5.4, { align: "center" });

  return badgeWidth;
};

const addHeader = async (doc, reportData) => {
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, PAGE_WIDTH, 42, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.amber);
  doc.text("JOBPROOF", MARGIN, 13);

  doc.setFontSize(18);
  doc.setTextColor(...BRAND.white);
  doc.text(formatValue(reportData.reportNumber, "Draft report"), MARGIN, 25);

  const badgeX = MARGIN;
  const badgeY = 30;
  const badgeWidth = addStatusBadge(doc, reportData, badgeX, badgeY);

  const companyX = badgeX + badgeWidth + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.white);
  doc.text(
    formatValue(reportData.businessName, "Business name not set"),
    companyX,
    35.4
  );

  const logo = await loadImage(reportData.businessLogo);

  if (logo) {
    const dimensions = getImageDimensions(logo, 24, 24);
    doc.setFillColor(...BRAND.white);
    doc.roundedRect(PAGE_WIDTH - MARGIN - 28, 7, 28, 28, 3, 3, "F");

    const imageFormat =
      reportData.businessLogo?.startsWith("data:image/png") ? "PNG" : "JPEG";

    doc.addImage(
      logo,
      imageFormat,
      PAGE_WIDTH - MARGIN - 26 + (24 - dimensions.width) / 2,
      9 + (24 - dimensions.height) / 2,
      dimensions.width,
      dimensions.height
    );
  }

  return 54;
};

const addInfoTable = (doc, title, rows, y) => {
  let currentY = addSectionTitle(doc, title, y);

  autoTable(doc, {
    startY: currentY,
    theme: "grid",
    head: [["Field", "Details"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
      textColor: BRAND.navy,
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND.blue,
      textColor: BRAND.white,
      fontStyle: "bold",
    },
    columnStyles: {
      0: {
        cellWidth: 45,
        fontStyle: "bold",
        fillColor: BRAND.lightBg,
      },
      1: {
        cellWidth: "auto",
      },
    },
  });

  return doc.lastAutoTable.finalY + 10;
};

const addTeamInvolved = (doc, reportData, y) => {
  const teamInvolved = reportData.teamInvolved || [];

  let currentY = addSectionTitle(doc, "Team involved", y);

  if (teamInvolved.length === 0) {
    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      body: [["No team members recorded for this job."]],
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4,
        lineColor: BRAND.border,
        textColor: BRAND.muted,
      },
    });

    return doc.lastAutoTable.finalY + 10;
  }

  const rows = teamInvolved.map((member, index) => [
    String(index + 1).padStart(2, "0"),
    formatValue(member.fullName, "Unknown user"),
    formatValue(member.email, "Not provided"),
    getRoleLabel(member.roleOnJob, member.role),
  ]);

  autoTable(doc, {
    startY: currentY,
    theme: "grid",
    head: [["#", "Name", "Email", "Job role"]],
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3,
      lineColor: BRAND.border,
      lineWidth: 0.2,
      textColor: BRAND.navy,
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND.blue,
      textColor: BRAND.white,
      fontStyle: "bold",
    },
    columnStyles: {
      0: {
        cellWidth: 13,
        halign: "center",
        fontStyle: "bold",
      },
      1: {
        cellWidth: 48,
        fontStyle: "bold",
      },
      2: {
        cellWidth: 70,
      },
      3: {
        cellWidth: 35,
        halign: "center",
      },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.textColor = BRAND.blue;
      }
    },
  });

  return doc.lastAutoTable.finalY + 10;
};

const addNotes = (doc, reportData, y) => {
  let currentY = addSectionTitle(doc, "Work notes", y);

  const rows = [
    ["Work completed", formatValue(reportData.workCompleted)],
    ["Issues found", formatValue(reportData.issuesFound)],
    ["Recommendations", formatValue(reportData.recommendations)],
  ];

  autoTable(doc, {
    startY: currentY,
    theme: "grid",
    body: rows,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 4,
      lineColor: BRAND.border,
      lineWidth: 0.2,
      textColor: BRAND.navy,
      valign: "top",
    },
    columnStyles: {
      0: {
        cellWidth: 45,
        fontStyle: "bold",
        fillColor: BRAND.lightBg,
      },
      1: {
        cellWidth: "auto",
      },
    },
  });

  return doc.lastAutoTable.finalY + 10;
};

const addPhotosSection = async (doc, title, photos, y) => {
  let currentY = addSectionTitle(doc, title, y);

  if (!photos || photos.length === 0) {
    autoTable(doc, {
      startY: currentY,
      theme: "grid",
      body: [[`No ${title.toLowerCase()} uploaded.`]],
      margin: { left: MARGIN, right: MARGIN },
      styles: {
        font: "helvetica",
        fontSize: 9,
        cellPadding: 4,
        lineColor: BRAND.border,
        textColor: BRAND.muted,
      },
    });

    return doc.lastAutoTable.finalY + 10;
  }

  const imageWidth = 82;
  const imageHeight = 62;
  const gap = 10;
  const leftX = MARGIN;
  const rightX = MARGIN + imageWidth + gap;

  for (let index = 0; index < photos.length; index += 1) {
    const isLeft = index % 2 === 0;
    const x = isLeft ? leftX : rightX;

    if (isLeft) {
      currentY = addPageIfNeeded(doc, currentY, imageHeight + 16);
    }

    const image = await loadImage(photos[index]);

    doc.setDrawColor(...BRAND.border);
    doc.setFillColor(...BRAND.lightBg);
    doc.roundedRect(x, currentY, imageWidth, imageHeight, 3, 3, "FD");

    if (image) {
      const dimensions = getImageDimensions(
        image,
        imageWidth - 6,
        imageHeight - 12
      );

      const format = photos[index]?.startsWith("data:image/png") ? "PNG" : "JPEG";

      doc.addImage(
        image,
        format,
        x + (imageWidth - dimensions.width) / 2,
        currentY + 5,
        dimensions.width,
        dimensions.height
      );
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...BRAND.muted);
      doc.text("Image unavailable", x + imageWidth / 2, currentY + 32, {
        align: "center",
      });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...BRAND.navy);
    doc.text(
      `${title.replace(" photos", "")} photo ${index + 1}`,
      x + 4,
      currentY + imageHeight - 4
    );

    if (!isLeft || index === photos.length - 1) {
      currentY += imageHeight + 10;
    }
  }

  return currentY + 4;
};

export const generatePDF = async (reportData) => {
  const doc = new jsPDF("p", "mm", "a4");

  let currentY = await addHeader(doc, reportData);

  addFooter(doc, 1);

  currentY = addInfoTable(
    doc,
    "Business details",
    [
      ["Business", formatValue(reportData.businessName)],
      ["Email", formatValue(reportData.businessEmail)],
      ["Phone", formatValue(reportData.businessPhone)],
      ["Created by", formatValue(reportData.workerName)],
    ],
    currentY
  );

  currentY = addInfoTable(
    doc,
    "Client and job details",
    [
      ["Status", getStatusLabel(reportData.status)],
      ["Client", formatValue(reportData.clientName)],
      ["Job address", formatValue(reportData.jobAddress)],
      ["Job date", formatDate(reportData.jobDate)],
      ["Starting hour", formatValue(reportData.startingHour)],
      ["Finish hour", formatValue(reportData.finishHour)],
      ["Total hours", formatValue(reportData.totalHours, "Not calculated")],
      ["Service type", formatValue(reportData.serviceType)],
    ],
    currentY
  );

  currentY = addTeamInvolved(doc, reportData, currentY);
  currentY = addNotes(doc, reportData, currentY);

  currentY = await addPhotosSection(
    doc,
    "Before photos",
    reportData.beforePhotos || [],
    currentY
  );

  currentY = await addPhotosSection(
    doc,
    "After photos",
    reportData.afterPhotos || [],
    currentY
  );

  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    addFooter(doc, page);
  }

  const fileName = `${formatValue(
    reportData.reportNumber,
    "jobproof-report"
  )}.pdf`;

  doc.save(fileName);
};

export default generatePDF;