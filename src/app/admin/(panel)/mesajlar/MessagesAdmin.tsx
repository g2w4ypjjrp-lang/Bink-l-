"use client";
import { fmtDT } from "@/lib/format";
import { useEffect, useState } from "react";
import { Archive, Mail, MessageCircle, Phone, Reply } from "lucide-react";
import { Button, Modal, Badge, PageHeader, Tabs, textareaCls, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { MSG_STATUS } from "@/components/admin/status";
import { setMessageStatus, replyMessage, deleteMessages } from "./actions";

type M = { id: string; name: string; phone: string; email: string; subject: string; message: string; status: string; archived: boolean; createdAt: string; wa: string; tel: string };

export function MessagesAdmin({ rows, openId, smtp }: { rows: M[]; openId?: string; smtp: boolean }) {
  const [box, setBox] = useState<"inbox" | "archive">("inbox");
  const [open, setOpen] = useState<string | null>(openId ?? null);
  const [reply, setReply] = useState("");
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const cur = rows.find((r) => r.id === open);
  useEffect(() => { if (cur && cur.status === "unread") run(setMessageStatus([cur.id], { status: "read" })); setReply(""); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = rows.filter((r) => r.archived === (box === "archive"));
  return (
    <div>
      <PageHeader title="İletişim Mesajları" description={`${rows.filter((r) => r.status === "unread" && !r.archived).length} okunmamış mesaj`} />
      <Tabs value={box} onChange={setBox} tabs={[{ key: "inbox", label: `Gelen kutusu (${rows.filter((r) => !r.archived).length})` }, { key: "archive", label: `Arşiv (${rows.filter((r) => r.archived).length})` }]} />
      <DataTable
        rows={list}
        exportName="mesajlar"
        onRowClick={(r) => setOpen(r.id)}
        rowClassName={(r) => (r.status === "unread" ? "font-semibold" : "")}
        searchKeys={(r) => `${r.name} ${r.email} ${r.phone} ${r.subject} ${r.message}`}
        filters={[{ key: "s", label: "Durum", options: Object.entries(MSG_STATUS).map(([value, v]) => ({ value, label: v.label })), match: (r, v) => r.status === v }]}
        bulk={[
          { label: "Okundu", run: (ids) => run(setMessageStatus(ids, { status: "read" }), "Güncellendi") },
          { label: "Okunmadı", run: (ids) => run(setMessageStatus(ids, { status: "unread" }), "Güncellendi") },
          { label: box === "inbox" ? "Arşivle" : "Arşivden çıkar", run: (ids) => run(setMessageStatus(ids, { archived: box === "inbox" }), "Güncellendi") },
          { label: "Sil", danger: true, run: async (ids) => { if (await confirm({ title: `${ids.length} mesaj silinsin mi?`, danger: true })) await run(deleteMessages(ids), "Silindi"); } },
        ]}
        columns={[
          { key: "from", header: "Gönderen", sortable: true, value: (r) => r.name, render: (r) => <div><p>{r.status === "unread" && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-gold" />}{r.name}</p><p className="text-xs font-normal text-charcoal/50">{r.email || r.phone}</p></div> },
          { key: "subj", header: "Mesaj", value: (r) => `${r.subject} ${r.message}`, render: (r) => <p className="line-clamp-1 max-w-md">{r.subject && <span>{r.subject} — </span>}<span className="font-normal text-charcoal/60">{r.message}</span></p> },
          { key: "s", header: "Durum", value: (r) => MSG_STATUS[r.status]?.label, render: (r) => <Badge tone={MSG_STATUS[r.status]?.tone}>{MSG_STATUS[r.status]?.label}</Badge> },
          { key: "d", header: "Tarih", sortable: true, value: (r) => r.createdAt, render: (r) => <span className="whitespace-nowrap font-normal">{fmtDT(r.createdAt, { dateStyle: "short", timeStyle: "short" })}</span> },
        ]}
        initialSort={{ key: "d", dir: "desc" }}
      />
      {cur && (
        <Modal side title={cur.subject || `${cur.name} — mesaj`} onClose={() => setOpen(null)} footer={<><Button variant="ghost" className="mr-auto" onClick={() => run(setMessageStatus([cur.id], { archived: !cur.archived }), cur.archived ? "Arşivden çıkarıldı" : "Arşivlendi")}><Archive size={14} /> {cur.archived ? "Arşivden çıkar" : "Arşivle"}</Button><Button variant="ghost" onClick={() => run(setMessageStatus([cur.id], { status: "replied" }), "Yanıtlandı olarak işaretlendi")}>Yanıtlandı işaretle</Button></>}>
          <div className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><Badge tone={MSG_STATUS[cur.status]?.tone}>{MSG_STATUS[cur.status]?.label}</Badge><span className="text-charcoal/55">{fmtDT(cur.createdAt)}</span></div>
            <p><b>{cur.name}</b> {cur.email && `· ${cur.email}`} {cur.phone && `· ${cur.phone}`}</p>
            <p className="whitespace-pre-line rounded-xl bg-cream/60 p-4 leading-relaxed">{cur.message}</p>
            <div className="flex flex-wrap gap-2">
              {cur.tel && <a href={`tel:${cur.tel}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 font-semibold"><Phone size={14} /> Ara</a>}
              {cur.wa && <a href={cur.wa} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1d7a46] px-3 font-semibold text-white"><MessageCircle size={14} /> WhatsApp</a>}
              {cur.email && <a href={`mailto:${cur.email}?subject=${encodeURIComponent("Re: " + (cur.subject || "Mesajınız"))}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-charcoal/12 px-3 font-semibold"><Mail size={14} /> E-posta istemcisi</a>}
            </div>
            {cur.email && (
              <div className="rounded-xl border border-charcoal/10 p-4">
                <p className="mb-2 font-semibold">Panelden yanıtla</p>
                <textarea className={textareaCls} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Yanıtınız…" />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs text-charcoal/50">{smtp ? "Yanıt e-posta ile gönderilir." : "SMTP ayarlı değil — yanıt kaydedilir, e-posta gönderilmez."}</span>
                  <Button loading={pending} disabled={reply.trim().length < 2} onClick={async () => { const x = await run(replyMessage(cur.id, reply), smtp ? "Yanıt gönderildi" : "Yanıtlandı olarak kaydedildi"); if (x.ok) setReply(""); }}><Reply size={14} /> Gönder</Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
