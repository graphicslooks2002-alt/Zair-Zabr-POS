export const getBgColor = (seed) => {
  const bgarr = [
    "#b73e3e",
    "#5b45b0",
    "#7f167f",
    "#735f32",
    "#1d2569",
    "#285430",
    "#f6b100",
    "#025cca",
    "#be3e3f",
    "#02ca3a",
  ];
  // Deterministic color when a seed is given (stable across re-renders),
  // random otherwise for backward compatibility.
  if (seed === undefined || seed === null) {
    return bgarr[Math.floor(Math.random() * bgarr.length)];
  }
  let hash = 0;
  for (const ch of String(seed)) hash += ch.charCodeAt(0);
  return bgarr[hash % bgarr.length];
};

export const getAvatarName = (name) => {
  if(!name) return "";

  return name.split(" ").map(word => word[0]).join("").toUpperCase();

}

export const formatDate = (date) => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}, ${date.getFullYear()}`;
};

export const formatDateAndTime = (date) => {
  const dateAndTime = new Date(date).toLocaleString("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: "Asia/Karachi"
  })

  return dateAndTime;
}