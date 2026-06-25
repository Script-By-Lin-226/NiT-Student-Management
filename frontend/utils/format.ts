export const formatAmount = (amount: number | string | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") return "0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("en-US").format(num);
};

export const parseExtraItems = (extraItemsStr: string | null | undefined): string => {
  if (!extraItemsStr) return "";
  const trimmed = extraItemsStr.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const items = JSON.parse(trimmed);
      if (Array.isArray(items)) {
        return items.map((it: any) => `${it.name} (${formatAmount(it.price)} MMK)`).join(", ");
      }
    } catch (e) {
      // fallback
    }
  }
  return extraItemsStr;
};

export const getExtraItemNames = (extraItemsStr: string | null | undefined): string => {
  if (!extraItemsStr) return "-";
  const trimmed = extraItemsStr.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const items = JSON.parse(trimmed);
      if (Array.isArray(items)) {
        return items.map((it: any) => it.name).join(", ") || "-";
      }
    } catch {}
  }
  return trimmed || "-";
};

export const getExtraItemPrices = (extraItemsStr: string | null | undefined, fallbackPrice?: number): string => {
  if (!extraItemsStr) {
    return fallbackPrice && fallbackPrice > 0 ? fallbackPrice.toLocaleString() : "-";
  }
  const trimmed = extraItemsStr.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const items = JSON.parse(trimmed);
      if (Array.isArray(items)) {
        return items.map((it: any) => (it.price || 0).toLocaleString()).join(", ") || "-";
      }
    } catch {}
  }
  return fallbackPrice && fallbackPrice > 0 ? fallbackPrice.toLocaleString() : "-";
};

export const getExtraItemMethods = (extraItemsStr: string | null | undefined, fallbackMethod?: string | null): string => {
  if (!extraItemsStr) return fallbackMethod || "-";
  const trimmed = extraItemsStr.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const items = JSON.parse(trimmed);
      if (Array.isArray(items)) {
        return items.map((it: any) => it.method || fallbackMethod || "-").join(", ") || "-";
      }
    } catch {}
  }
  return fallbackMethod || "-";
};

export const formatSpecificDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [_, year, month, day] = match;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${parseInt(day, 10)}, ${year}`;
    }
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
};


