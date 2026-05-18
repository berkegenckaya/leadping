export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "unqualified"
  | "converted"
  | "lost";

export type LeadUrgency = "low" | "medium" | "high" | "critical";

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "Yeni",
  contacted: "İletişime Geçildi",
  qualified: "Nitelikli",
  unqualified: "Niteliksiz",
  converted: "Dönüştürüldü",
  lost: "Kaybedildi",
};

export const LEAD_URGENCY_LABELS: Record<LeadUrgency, string> = {
  low: "Düşük",
  medium: "Orta",
  high: "Yüksek",
  critical: "Kritik",
};
