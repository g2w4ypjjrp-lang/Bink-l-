"use client";
import { fmtDT } from "@/lib/format";
import { Database, Server, HardDrive, ShieldCheck, Download, Mail, Activity } from "lucide-react";
import { Badge, Button, Card, PageHeader, Tabs, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { useState } from "react";
import { cleanup } from "./actions";

type Status = { db: { ok: boolean; ms: number; version: string; size: string }; node: string; uptime: number; memory: number; load: string; env: string; uploads: { mb: number; files: number }; smtp: boolean; failed24: number; sessions: number; counts: Record<string, number> };
const ACTION: Record<string, string> = { create: "Oluşturma", update: "Güncelleme", delete: "Silme", status: "Durum", login: "Giriş", logout: "Çıkış", export: "Dışa aktarma", backup: "Yedek", upload: "Yükleme" };
const EXPORTS: [string, string][] = [["reservations", "Rezervasyonlar"], ["event_requests", "Organizasyon başvuruları"], ["orders", "Siparişler"], ["contact_messages", "İletişim mesajları"], ["products", "Ürünler"], ["analytics", "Analitik olayları"], ["qr_scans", "QR taramaları"], ["audit_logs", "İşlem logları"], ["login_logs", "Giriş kayıtları"]];

export function SystemClient({ status: s, logins, audits, errors, outbound }: { status: Status; logins: { id: string; email: string; success: boolean; reason: string; ip: string; ua: string; at: string }[]; audits: { id: string; user: string; action: string; entity: string; entityId: string; summary: string; ip: string; at: string }[]; errors: { id: string; source: string; message: string; path: string; stack: string; at: string }[]; outbound: { id: string; channel: string; to: string; subject: string; status: string; error: string; at: string }[] }) {
  const [tab, setTab] = useState<"status" | "audit" | "logins" | "errors" | "outbound" | "backup">("status");
  const { run } = useRun();
  const confirm = useConfirm();
  const dt = (iso: string) => fmtDT(iso);
  return (
    <div>
      <PageHeader title="Sistem & Güvenlik" description="Sistem durumu, güvenlik ve işlem kayıtları, yedekleme ve veri dışa aktarma." />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "status", label: "Sistem durumu" }, { key: "audit", label: "İşlem logları" }, { key: "logins", label: "Giriş kayıtları" }, { key: "errors", label: `Hata kayıtları (${errors.length})` }, { key: "outbound", label: "Giden bildirimler" }, { key: "backup", label: "Yedekleme & dışa aktarma" }]} />
      {tab === "status" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card title={<span className="flex items-center gap-2"><Database size={16} /> Veritabanı</span>}><p className="flex items-center gap-2 text-sm"><Badge tone="green">Çalışıyor</Badge> {s.db.ms} ms yanıt</p><p className="mt-2 text-sm text-charcoal/60">{s.db.version} · {s.db.size}</p></Card>
          <Card title={<span className="flex items-center gap-2"><Server size={16} /> Uygulama sunucusu</span>}><p className="text-sm">Node {s.node} · {s.env}</p><p className="mt-2 text-sm text-charcoal/60">Çalışma süresi {Math.floor(s.uptime / 3600)} sa {Math.floor((s.uptime % 3600) / 60)} dk · RAM {s.memory} MB · Yük {s.load}</p></Card>
          <Card title={<span className="flex items-center gap-2"><HardDrive size={16} /> Medya depolama</span>}><p className="text-sm">{s.uploads.files} dosya · {s.uploads.mb} MB</p><p className="mt-2 text-sm text-charcoal/60">Görseller otomatik WebP&apos;ye dönüştürülür.</p></Card>
          <Card title={<span className="flex items-center gap-2"><ShieldCheck size={16} /> Güvenlik</span>}>
            <ul className="space-y-1.5 text-sm">
              <li>Aktif oturum: <b>{s.sessions}</b></li>
              <li>Son 24 saatte başarısız giriş: <b className={s.failed24 > 10 ? "text-red-700" : ""}>{s.failed24}</b></li>
              <li className="text-charcoal/60">bcrypt şifreleme · hesap kilitleme (5 deneme / 15 dk) · rate limit · CSRF (origin kontrolü) · CSP & güvenlik başlıkları · rol bazlı yetki</li>
            </ul>
          </Card>
          <Card title={<span className="flex items-center gap-2"><Mail size={16} /> E-posta</span>}><Badge tone={s.smtp ? "green" : "yellow"}>{s.smtp ? "SMTP yapılandırıldı" : "SMTP yapılandırılmadı"}</Badge></Card>
          <Card title={<span className="flex items-center gap-2"><Activity size={16} /> Kayıt sayıları</span>}><ul className="grid grid-cols-2 gap-1 text-sm">{Object.entries({ Rezervasyon: s.counts.reservations, Sipariş: s.counts.orders, Ürün: s.counts.products, "Analitik olayı": s.counts.analytics, Galeri: s.counts.gallery, Kullanıcı: s.counts.users }).map(([k, v]) => <li key={k}>{k}: <b>{v.toLocaleString("tr-TR")}</b></li>)}</ul></Card>
          <Card title="Bakım" className="md:col-span-2 xl:col-span-3">
            <div className="flex flex-wrap gap-2">
              {([["sessions", "Süresi dolmuş oturumları temizle"], ["errors", "30 günden eski hata kayıtlarını sil"], ["notifications", "90 günden eski okunmuş bildirimleri sil"], ["analytics", "2 yıldan eski analitik verisini sil"]] as const).map(([k, l]) => (
                <Button key={k} variant="ghost" size="sm" onClick={async () => { if (await confirm({ title: `${l}?` })) { const r = await run(cleanup(k)); if (r.ok) alert(`${r.data} kayıt temizlendi`); } }}>{l}</Button>
              ))}
            </div>
          </Card>
        </div>
      )}
      {tab === "audit" && (
        <DataTable rows={audits} exportName="islem-loglari" pageSize={50} searchKeys={(a) => `${a.user} ${a.entity} ${a.summary} ${a.entityId}`}
          filters={[{ key: "a", label: "İşlem", options: Object.entries(ACTION).map(([value, label]) => ({ value, label })), match: (a, v) => a.action === v }, { key: "e", label: "Kayıt türü", options: [...new Set(audits.map((a) => a.entity))].map((v) => ({ value: v, label: v })), match: (a, v) => a.entity === v }]}
          columns={[
            { key: "at", header: "Zaman", sortable: true, value: (a) => a.at, render: (a) => <span className="whitespace-nowrap text-xs">{dt(a.at)}</span> },
            { key: "u", header: "Kullanıcı", value: (a) => a.user },
            { key: "a", header: "İşlem", value: (a) => ACTION[a.action] ?? a.action, render: (a) => <Badge tone={a.action === "delete" ? "red" : a.action === "create" ? "green" : "gray"}>{ACTION[a.action] ?? a.action}</Badge> },
            { key: "e", header: "Kayıt", value: (a) => a.entity },
            { key: "s", header: "Açıklama", value: (a) => a.summary, render: (a) => <span className="line-clamp-1 max-w-md text-charcoal/70">{a.summary}</span> },
            { key: "ip", header: "IP", value: (a) => a.ip, hideOnMobile: true },
          ]} />
      )}
      {tab === "logins" && (
        <DataTable rows={logins} exportName="giris-kayitlari" pageSize={50} searchKeys={(l) => `${l.email} ${l.ip}`}
          filters={[{ key: "s", label: "Sonuç", options: [{ value: "1", label: "Başarılı" }, { value: "0", label: "Başarısız" }], match: (l, v) => l.success === (v === "1") }]}
          columns={[
            { key: "at", header: "Zaman", sortable: true, value: (l) => l.at, render: (l) => <span className="whitespace-nowrap text-xs">{dt(l.at)}</span> },
            { key: "e", header: "E-posta", value: (l) => l.email },
            { key: "s", header: "Sonuç", value: (l) => (l.success ? "Başarılı" : "Başarısız"), render: (l) => <Badge tone={l.success ? "green" : "red"}>{l.success ? "Başarılı" : { bad_password: "Hatalı şifre", unknown_user: "Bilinmeyen kullanıcı", locked: "Kilitli", inactive: "Pasif hesap" }[l.reason] ?? "Başarısız"}</Badge> },
            { key: "ip", header: "IP", value: (l) => l.ip },
            { key: "ua", header: "Tarayıcı", value: (l) => l.ua, hideOnMobile: true, render: (l) => <span className="line-clamp-1 max-w-xs text-xs text-charcoal/50">{l.ua}</span> },
          ]} />
      )}
      {tab === "errors" && (
        <DataTable rows={errors} exportName="hata-kayitlari" empty="Hata kaydı yok 🎉" searchKeys={(e) => `${e.source} ${e.message} ${e.path}`}
          columns={[
            { key: "at", header: "Zaman", sortable: true, value: (e) => e.at, render: (e) => <span className="whitespace-nowrap text-xs">{dt(e.at)}</span> },
            { key: "src", header: "Kaynak", value: (e) => e.source },
            { key: "m", header: "Mesaj", value: (e) => e.message, render: (e) => <details><summary className="cursor-pointer text-sm">{e.message.slice(0, 120)}</summary><pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded bg-cream p-2 text-[11px]">{e.stack}</pre></details> },
            { key: "p", header: "Yol", value: (e) => e.path, hideOnMobile: true },
          ]} />
      )}
      {tab === "outbound" && (
        <DataTable rows={outbound} exportName="giden-bildirimler" empty="Giden bildirim yok."
          columns={[
            { key: "at", header: "Zaman", sortable: true, value: (o) => o.at, render: (o) => <span className="whitespace-nowrap text-xs">{dt(o.at)}</span> },
            { key: "c", header: "Kanal", value: (o) => o.channel },
            { key: "to", header: "Alıcı", value: (o) => o.to },
            { key: "s", header: "Konu", value: (o) => o.subject },
            { key: "st", header: "Durum", value: (o) => o.status, render: (o) => <Badge tone={o.status === "sent" ? "green" : o.status === "failed" ? "red" : "gray"}>{{ sent: "Gönderildi", failed: "Hata", skipped: "Atlandı (sağlayıcı yok)", queued: "Kuyrukta" }[o.status] ?? o.status}</Badge> },
            { key: "e", header: "Hata", value: (o) => o.error, hideOnMobile: true },
          ]} />
      )}
      {tab === "backup" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Yedekleme">
            <p className="text-sm text-charcoal/70">Tüm menü, içerik, rezervasyon, sipariş ve ayar verilerini tek bir JSON dosyası olarak indirin.</p>
            <a href="/api/admin/backup" className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-forest px-4 text-sm font-semibold text-cream"><Download size={15} /> JSON yedeği indir</a>
            <div className="mt-5 rounded-xl bg-cream/70 p-4 text-xs leading-relaxed text-charcoal/70">
              <p className="font-semibold text-charcoal">Otomatik tam yedek (önerilen)</p>
              <p className="mt-1">Sunucuda <code>scripts/backup.sh</code> günlük olarak çalışır (Docker kurulumunda <code>backup</code> servisi): PostgreSQL <code>pg_dump</code> + yüklenen medya dosyaları, 14 gün saklama. Geri yükleme: <code>scripts/restore.sh &lt;dosya&gt;</code>.</p>
            </div>
          </Card>
          <Card title="Veri dışa aktarma (Excel uyumlu CSV)">
            <ul className="grid gap-2 sm:grid-cols-2">
              {EXPORTS.map(([k, l]) => <li key={k}><a href={`/api/admin/export/${k}`} className="flex items-center justify-between rounded-lg border border-charcoal/10 px-3 py-2.5 text-sm hover:bg-cream/50">{l} <Download size={14} /></a></li>)}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
