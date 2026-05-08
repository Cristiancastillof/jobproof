export const calculateTotalHours = (startingHour, finishHour) => {
  if (!startingHour || !finishHour) return "";

  const [startHours, startMinutes] = startingHour.split(":").map(Number);
  const [finishHours, finishMinutes] = finishHour.split(":").map(Number);

  const startTotalMinutes = startHours * 60 + startMinutes;
  let finishTotalMinutes = finishHours * 60 + finishMinutes;

  if (finishTotalMinutes === startTotalMinutes) {
    return "";
  }

  if (finishTotalMinutes < startTotalMinutes) {
    finishTotalMinutes += 24 * 60;
  }

  const differenceMinutes = finishTotalMinutes - startTotalMinutes;
  const hours = Math.floor(differenceMinutes / 60);
  const minutes = differenceMinutes % 60;

  if (minutes === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours}h ${minutes}m`;
};