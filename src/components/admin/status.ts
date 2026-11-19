type Tone = "gray" | "green" | "yellow" | "red" | "blue" | "gold" | "purple";
export const RES_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: "Beklemede", tone: "yellow" },
  confirmed: { label: "Onaylandı", tone: "green" },
  rejected: { label: "Reddedildi", tone: "red" },
  cancelled: { label: "İptal", tone: "gray" },
  completed: { label: "Tamamlandı", tone: "blue" },
  no_show: { label: "Gelmedi", tone: "purple" },
};
export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: "Yeni", tone: "gold" },
  preparing: { label: "Hazırlanıyor", tone: "yellow" },
  ready: { label: "Hazır", tone: "blue" },
  delivered: { label: "Teslim edildi", tone: "green" },
  cancelled: { label: "İptal edildi", tone: "gray" },
};
export const EVENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: "Yeni", tone: "gold" },
  contacted: { label: "Görüşüldü", tone: "blue" },
  quoted: { label: "Teklif gönderildi", tone: "purple" },
  approved: { label: "Onaylandı", tone: "green" },
  rejected: { label: "Reddedildi", tone: "red" },
  completed: { label: "Tamamlandı", tone: "gray" },
};
export const MSG_STATUS: Record<string, { label: string; tone: Tone }> = {
  unread: { label: "Okunmadı", tone: "gold" },
  read: { label: "Okundu", tone: "gray" },
  replied: { label: "Yanıtlandı", tone: "green" },
};
export const OCCASIONS: Record<string, string> = { birthday: "Doğum günü", celebration: "Kutlama", anniversary: "Yıl dönümü", proposal: "Evlilik teklifi", business: "İş yemeği", other: "Diğer" };
