"use client";
import { fmtDT } from "@/lib/format";
import { useState } from "react";
import { Plus, ShieldCheck, LogOut } from "lucide-react";
import { Button, Modal, F, inputCls, Toggle, Badge, PageHeader, Tabs, Card, useRun, useConfirm } from "@/components/admin/ui";
import { DataTable } from "@/components/admin/DataTable";
import { saveUser, deleteUser, saveRole, deleteRole, revokeSessions } from "./actions";

type U = { id: string; name: string; email: string; roleId: string; roleName: string; active: boolean; lastLoginAt: string | null; sessions: number };
type R = { id: string; key: string; name: string; description: string; system: boolean; users: number; permissions: string[] };
type P = { key: string; name: string; group: string };

export function UsersAdmin({ users, roles, permissions, meId }: { users: U[]; roles: R[]; permissions: P[]; meId: string }) {
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [eu, setEu] = useState<U | "new" | null>(null);
  const [er, setEr] = useState<R | "new" | null>(null);
  return (
    <div>
      <PageHeader title="Kullanıcılar & Yetkiler" description="Panel kullanıcıları, roller ve yetki matrisi." actions={tab === "users" ? <Button onClick={() => setEu("new")}><Plus size={15} /> Kullanıcı ekle</Button> : <Button onClick={() => setEr("new")}><Plus size={15} /> Rol ekle</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ key: "users", label: "Kullanıcılar" }, { key: "roles", label: "Roller & yetkiler" }]} />
      {tab === "users" ? (
        <DataTable
          rows={users}
          exportName="kullanicilar"
          onRowClick={(u) => setEu(u)}
          columns={[
            { key: "n", header: "Ad", sortable: true, value: (u) => u.name, render: (u) => <div><p className="font-semibold">{u.name}{u.id === meId && <span className="ml-1.5 text-xs text-charcoal/45">(siz)</span>}</p><p className="text-xs text-charcoal/50">{u.email}</p></div> },
            { key: "r", header: "Rol", value: (u) => u.roleName, render: (u) => <Badge tone="green">{u.roleName}</Badge> },
            { key: "l", header: "Son giriş", sortable: true, value: (u) => u.lastLoginAt ?? "", render: (u) => (u.lastLoginAt ? fmtDT(u.lastLoginAt) : "—") },
            { key: "s", header: "Aktif oturum", value: (u) => u.sessions },
            { key: "a", header: "Durum", value: (u) => (u.active ? "Aktif" : "Pasif"), render: (u) => <Badge tone={u.active ? "green" : "gray"}>{u.active ? "Aktif" : "Pasif"}</Badge> },
          ]}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((r) => (
            <Card key={r.id} title={<span className="flex items-center gap-2"><ShieldCheck size={16} className="text-gold-dark" /> {r.name}</span>} actions={<Button size="sm" variant="ghost" onClick={() => setEr(r)}>Düzenle</Button>}>
              <p className="text-sm text-charcoal/60">{r.description}</p>
              <p className="mt-3 text-xs text-charcoal/50">{r.users} kullanıcı · {r.permissions.length} yetki</p>
              <div className="mt-3 flex flex-wrap gap-1">{r.permissions.slice(0, 8).map((p) => <Badge key={p}>{permissions.find((x) => x.key === p)?.name.split(" (")[0] ?? p}</Badge>)}{r.permissions.length > 8 && <Badge>+{r.permissions.length - 8}</Badge>}</div>
            </Card>
          ))}
        </div>
      )}
      {eu && <UserEditor u={eu === "new" ? null : eu} roles={roles} meId={meId} onClose={() => setEu(null)} />}
      {er && <RoleEditor r={er === "new" ? null : er} permissions={permissions} onClose={() => setEr(null)} />}
    </div>
  );
}

function UserEditor({ u, roles, meId, onClose }: { u: U | null; roles: R[]; meId: string; onClose: () => void }) {
  const [f, setF] = useState({ id: u?.id, name: u?.name ?? "", email: u?.email ?? "", roleId: u?.roleId ?? roles.find((r) => r.key === "staff")?.id ?? roles[0].id, active: u?.active ?? true, password: "" });
  const { run, pending } = useRun();
  const confirm = useConfirm();
  return (
    <Modal title={u ? "Kullanıcıyı düzenle" : "Yeni kullanıcı"} onClose={onClose} footer={<>{u && u.id !== meId && <Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: `${u.email} silinsin mi?`, danger: true })) { const x = await run(deleteUser(u.id), "Silindi"); if (x.ok) onClose(); } }}>Sil</Button>}<Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveUser({ ...f, password: f.password || undefined }), "Kaydedildi"); if (x.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid gap-3">
        <F label="Ad soyad"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
        <F label="E-posta"><input type="email" className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></F>
        <F label="Rol"><select className={inputCls} value={f.roleId} onChange={(e) => setF({ ...f, roleId: e.target.value })}>{roles.map((r) => <option key={r.id} value={r.id}>{r.name} — {r.description}</option>)}</select></F>
        <F label={u ? "Yeni şifre (değiştirmek için)" : "Şifre"} hint="En az 10 karakter, büyük/küçük harf ve rakam"><input type="password" autoComplete="new-password" className={inputCls} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></F>
        <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Hesap aktif" />
        {u && u.sessions > 0 && <Button variant="ghost" size="sm" onClick={() => run(revokeSessions(u.id), "Oturumlar kapatıldı")}><LogOut size={14} /> Tüm oturumlarını kapat ({u.sessions})</Button>}
      </div>
    </Modal>
  );
}

function RoleEditor({ r, permissions, onClose }: { r: R | null; permissions: P[]; onClose: () => void }) {
  const [f, setF] = useState({ id: r?.id, name: r?.name ?? "", description: r?.description ?? "", permissions: r?.permissions ?? ["dashboard.view"] });
  const { run, pending } = useRun();
  const confirm = useConfirm();
  const groups = [...new Set(permissions.map((p) => p.group))];
  const isAdmin = r?.key === "admin";
  return (
    <Modal title={r ? `Rol: ${r.name}` : "Yeni rol"} size="lg" onClose={onClose} footer={<>{r && !r.system && <Button variant="danger" className="mr-auto" onClick={async () => { if (await confirm({ title: "Rol silinsin mi?", danger: true })) { const x = await run(deleteRole(r.id), "Silindi"); if (x.ok) onClose(); } }}>Sil</Button>}<Button variant="ghost" onClick={onClose}>Vazgeç</Button><Button loading={pending} onClick={async () => { const x = await run(saveRole(f), "Rol kaydedildi"); if (x.ok) onClose(); }}>Kaydet</Button></>}>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Rol adı"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></F>
        <F label="Açıklama"><input className={inputCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></F>
      </div>
      {isAdmin && <p className="mt-3 rounded-lg bg-cream px-3 py-2 text-xs text-charcoal/60">Admin rolü her zaman tüm yetkilere sahiptir.</p>}
      <div className="mt-5 space-y-4">
        {groups.map((g) => (
          <fieldset key={g} disabled={isAdmin}>
            <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-charcoal/50">{g}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {permissions.filter((p) => p.group === g).map((p) => (
                <label key={p.key} className="flex items-center gap-2.5 rounded-lg border border-charcoal/8 px-3 py-2 text-sm">
                  <input type="checkbox" className="accent-forest" checked={f.permissions.includes(p.key)} onChange={(e) => setF({ ...f, permissions: e.target.checked ? [...f.permissions, p.key] : f.permissions.filter((x) => x !== p.key) })} />
                  {p.name}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
    </Modal>
  );
}
