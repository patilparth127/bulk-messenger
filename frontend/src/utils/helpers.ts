export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string): string {
  if (!phone) return "—";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith("91")) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  return phone;
}

export function genderLabel(g: string): string {
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export function statusColor(status: string): string {
  switch (status) {
    case "sent":
      return "#16a34a";
    case "failed":
      return "#dc2626";
    default:
      return "#d97706";
  }
}

export function statusBg(status: string): string {
  switch (status) {
    case "sent":
      return "#dcfce7";
    case "failed":
      return "#fee2e2";
    default:
      return "#fef3c7";
  }
}
