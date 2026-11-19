import "server-only";
import { getSettings } from "./settings";
import { formatDateTR } from "./utils";

export async function customerMessage(r: { name: string; date: Date; time: string; guests: number; code: string }, status: string) {
  const s = await getSettings();
  const when = `${formatDateTR(r.date.toISOString().slice(0, 10))} ${r.time}`;
  const map: Record<string, string> = {
    confirmed: `Sayın ${r.name}, ${when} için ${r.guests} kişilik rezervasyonunuz onaylanmıştır. Rezervasyon kodu: ${r.code}. Sizi ağırlamaktan mutluluk duyacağız. — ${s.business.name}`,
    rejected: `Sayın ${r.name}, ${when} için rezervasyon talebinizi maalesef karşılayamıyoruz. Farklı bir saat için bizi ${s.business.phone} numarasından arayabilirsiniz. — ${s.business.name}`,
    cancelled: `Sayın ${r.name}, ${when} tarihli rezervasyonunuz iptal edilmiştir. — ${s.business.name}`,
  };
  return map[status] ?? null;
}

