export const generateReportNumber = () => {
  const savedReports =
    JSON.parse(localStorage.getItem("jobproofReports")) || [];

  const currentYear = new Date().getFullYear();

  const reportsFromCurrentYear = savedReports.filter((report) =>
    report.reportNumber?.startsWith(`JP-${currentYear}`)
  );

  const nextNumber = reportsFromCurrentYear.length + 1;

  const paddedNumber = String(nextNumber).padStart(4, "0");

  return `JP-${currentYear}-${paddedNumber}`;
};