"use client";
import { useState } from "react";
import { MapPin } from "lucide-react";

/** Gizlilik ve performans için tıklayınca yüklenen Google Maps */
export function MapEmbed({ query, lat, lng, title }: { query: string; lat?: string; lng?: string; title: string }) {
  const [load, setLoad] = useState(false);
  const q = lat && lng ? `${lat},${lng}` : query;
  const src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&z=15&output=embed`;
  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-[28px] bg-sage/30">
      {load ? (
        <iframe title={title} src={src} className="absolute inset-0 h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
      ) : (
        <button onClick={() => setLoad(true)} className="group absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_30%_30%,#c9d2c3,transparent_60%),radial-gradient(circle_at_70%_70%,#dccdb8,transparent_55%)] text-forest">
          <svg className="absolute inset-0 h-full w-full opacity-30" aria-hidden="true">
            <defs>
              <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M48 0H0V48" fill="none" stroke="#173D2B" strokeOpacity=".25" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <path d="M-20 260 C 120 200, 220 320, 380 240 S 640 120, 900 220" stroke="#B89A62" strokeWidth="6" fill="none" strokeOpacity=".7" />
          </svg>
          <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-forest text-cream shadow-xl transition group-hover:scale-110">
            <MapPin size={28} />
          </span>
          <span className="relative rounded-full bg-ivory/90 px-5 py-2.5 text-sm font-semibold shadow">Haritayı yükle</span>
        </button>
      )}
    </div>
  );
}
