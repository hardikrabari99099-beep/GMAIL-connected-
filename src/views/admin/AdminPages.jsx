import { useEffect, useRef, useState } from "react";
import { api, formatINR, formatApiError } from "../../lib/api";
import {
  DEFAULT_CERT_LAYOUT,
  buildVerificationUrl,
  generateCertificateCode,
  generateCertificateImage,
  generateQrDataUrl,
} from "../../lib/payout-cert-qr";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";
import { toast } from "sonner";
import {
  Pencil,
  Plus,
  Trash2,
  Package,
  FileText,
  Users,
  ShoppingBag,
  IndianRupee,
  Award,
  Upload,
  Sparkles,
  Loader2,
  Trophy,
  Gift,
  Tag,
  Wallet,
  Briefcase,
  Target,
  MessageSquare,
  Phone,
  Mail,
  QrCode,
  Download,
  RefreshCw,
} from "lucide-react";

export function AdminDashboard() {
  const [s, setS] = useState(null);
  useEffect(() => {
    api.get("/admin/stats").then((r) => setS(r.data));
  }, []);
  const items = [
    { k: "plans", label: "Plans", icon: <Package /> },
    { k: "blogs", label: "Blog Posts", icon: <FileText /> },
    { k: "leads", label: "Leads", icon: <Users /> },
    { k: "orders", label: "Orders", icon: <ShoppingBag /> },
  ];
  return (
    <div>
      <div className="chip mb-4">Overview</div>
      <h1 className="font-display text-4xl" data-testid="admin-dashboard-title">
        Dashboard
      </h1>
      {s && s.pending_orders > 0 && (
        <div
          className="card-panel glow-border p-5 mt-8 flex items-center justify-between"
          data-testid="pending-alert"
        >
          <div>
            <div className="text-xs uppercase tracking-wider font-mono text-[var(--accent)]">
              Action needed
            </div>
            <div className="font-display text-xl mt-1">
              {s.pending_orders} pending payment{s.pending_orders > 1 ? "s" : ""} to verify
            </div>
          </div>
          <a href="/admin/orders" className="btn-amber rounded-full px-5 py-2.5 text-sm">
            Review →
          </a>
        </div>
      )}
      <div className="grid md:grid-cols-4 gap-4 mt-10">
        {items.map((it, i) => (
          <div key={it.k} className="card-panel p-6" data-testid={`stat-${it.k}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">
                {it.label}
              </div>
              <div className="text-[var(--accent)]">{it.icon}</div>
            </div>
            <div className="font-display text-4xl mt-5">{s ? s[it.k] : "—"}</div>
          </div>
        ))}
        <div className="card-panel p-6 md:col-span-4 glow-border" data-testid="stat-revenue">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-[var(--muted-2)] font-mono">
              Total Revenue
            </div>
            <IndianRupee className="text-[var(--accent)]" />
          </div>
          <div className="font-display text-5xl mt-5">{s ? formatINR(s.revenue) : "—"}</div>
        </div>
      </div>
    </div>
  );
}

const empty = {
  name: "",
  account_size: 100000,
  challenge_fee: 4999,
  profit_target_points: 750,
  profit_share: 70,
  max_loss_limit: 20,
  min_trading_days: 10,
  total_trading_days: 15,
  trades_per_day: 3,
  description: "",
  features: [],
  popular: false,
  order: 0,
};

export function AdminPlans() {
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/plans").then((r) => setPlans(r.data));
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    const payload = {
      ...editing,
      features: Array.isArray(editing.features)
        ? editing.features
        : (editing.features || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
    };
    try {
      if (editing.id) await api.put(`/plans/${editing.id}`, payload);
      else await api.post("/plans", payload);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await api.delete(`/plans/${id}`);
    toast.success("Deleted");
    load();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="chip mb-3">Plans</div>
          <h1 className="font-display text-4xl">Challenge Plans</h1>
        </div>
        <button
          onClick={() => setEditing({ ...empty, features: "" })}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="plan-new-btn"
        >
          <Plus size={16} /> New Plan
        </button>
      </div>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Fee</TableHead>
              <TableHead>Popular</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((p) => (
              <TableRow
                key={p.id}
                className="border-[var(--border)]"
                data-testid={`plan-row-${p.id}`}
              >
                <TableCell className="font-display">{p.name}</TableCell>
                <TableCell>{formatINR(p.account_size)}</TableCell>
                <TableCell>{formatINR(p.challenge_fee)}</TableCell>
                <TableCell>{p.popular ? "★" : ""}</TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setEditing({ ...p, features: (p.features || []).join("\n") })}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2 inline-flex items-center gap-1"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del(p.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md inline-flex items-center gap-1 text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing?.id ? "Edit Plan" : "New Plan"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Order</Label>
                  <Input
                    type="number"
                    value={editing.order}
                    onChange={(e) => setEditing({ ...editing, order: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Account Size (₹)</Label>
                  <Input
                    type="number"
                    value={editing.account_size}
                    onChange={(e) => setEditing({ ...editing, account_size: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Challenge Fee (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.challenge_fee}
                    onChange={(e) => setEditing({ ...editing, challenge_fee: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Profit Share %</Label>
                  <Input
                    type="number"
                    value={editing.profit_share}
                    onChange={(e) => setEditing({ ...editing, profit_share: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Max Loss %</Label>
                  <Input
                    type="number"
                    value={editing.max_loss_limit}
                    onChange={(e) => setEditing({ ...editing, max_loss_limit: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Min Days</Label>
                  <Input
                    type="number"
                    value={editing.min_trading_days}
                    onChange={(e) => setEditing({ ...editing, min_trading_days: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Total Days</Label>
                  <Input
                    type="number"
                    value={editing.total_trading_days}
                    onChange={(e) =>
                      setEditing({ ...editing, total_trading_days: +e.target.value })
                    }
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Profit Target (pts)</Label>
                  <Input
                    type="number"
                    value={editing.profit_target_points}
                    onChange={(e) =>
                      setEditing({ ...editing, profit_target_points: +e.target.value })
                    }
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Trades/Day</Label>
                  <Input
                    type="number"
                    value={editing.trades_per_day}
                    onChange={(e) => setEditing({ ...editing, trades_per_day: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={editing.description}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Features (one per line)</Label>
                <Textarea
                  rows={5}
                  value={editing.features}
                  onChange={(e) => setEditing({ ...editing, features: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.popular}
                  onChange={(e) => setEditing({ ...editing, popular: e.target.checked })}
                />{" "}
                Most Popular
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={save}
              className="btn-amber rounded-full px-6 py-2.5 text-sm"
              data-testid="plan-save-btn"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const emptyBlog = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image: "",
  author: "IndiFunded Team",
  published: true,
};

export function AdminBlogs() {
  const [blogs, setBlogs] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () => api.get("/blogs/all").then((r) => setBlogs(r.data));
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    try {
      if (editing.id) await api.put(`/blogs/${editing.id}`, editing);
      else await api.post("/blogs", editing);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete?")) return;
    await api.delete(`/blogs/${id}`);
    toast.success("Deleted");
    load();
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="chip mb-3">Blog</div>
          <h1 className="font-display text-4xl">Posts</h1>
        </div>
        <button
          onClick={() => setEditing({ ...emptyBlog })}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="blog-new-btn"
        >
          <Plus size={16} /> New Post
        </button>
      </div>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Published</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blogs.map((b) => (
              <TableRow
                key={b.id}
                className="border-[var(--border)]"
                data-testid={`blog-row-${b.id}`}
              >
                <TableCell className="font-display">{b.title}</TableCell>
                <TableCell className="font-mono text-xs text-[var(--muted)]">{b.slug}</TableCell>
                <TableCell>{b.published ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setEditing(b)}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del(b.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing?.id ? "Edit Post" : "New Post"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Title</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Cover Image URL</Label>
                <Input
                  value={editing.cover_image}
                  onChange={(e) => setEditing({ ...editing, cover_image: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Author</Label>
                <Input
                  value={editing.author}
                  onChange={(e) => setEditing({ ...editing, author: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Excerpt</Label>
                <Textarea
                  rows={2}
                  value={editing.excerpt}
                  onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  rows={10}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.published}
                  onChange={(e) => setEditing({ ...editing, published: e.target.checked })}
                />{" "}
                Published
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={save}
              className="btn-amber rounded-full px-6 py-2.5 text-sm"
              data-testid="blog-save-btn"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminLeads() {
  const [leads, setLeads] = useState([]);
  const load = () => api.get("/leads").then((r) => setLeads(r.data));
  useEffect(() => {
    load();
  }, []);
  const del = async (id) => {
    if (!window.confirm("Delete lead?")) return;
    await api.delete(`/leads/${id}`);
    toast.success("Deleted");
    load();
  };
  return (
    <div>
      <div className="chip mb-3">Contact</div>
      <h1 className="font-display text-4xl">Leads ({leads.length})</h1>
      <div className="card-panel overflow-hidden mt-10">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((l) => (
              <TableRow
                key={l.id}
                className="border-[var(--border)]"
                data-testid={`lead-row-${l.id}`}
              >
                <TableCell>
                  {l.first_name} {l.last_name}
                </TableCell>
                <TableCell className="text-[var(--muted)]">{l.email}</TableCell>
                <TableCell className="font-mono text-xs">{l.phone}</TableCell>
                <TableCell>{l.city}</TableCell>
                <TableCell>{l.challenge_type}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {new Date(l.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => del(l.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function todayDDMMYYYY() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function downloadDataUrl(dataUrl, filename) {
  if (!dataUrl) return;
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

const emptyCert = () => ({
  image_url: "",
  trader_name: "",
  amount: 25000,
  plan: "Pro",
  account_size: 300000,
  payout_date: todayDDMMYYYY(),
  certificate_code: generateCertificateCode(),
  payout_id: "",
  utr_last4: "",
  order: 0,
  visible: true,
});

export function AdminCertificates() {
  const [certs, setCerts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [studioMode, setStudioMode] = useState("auto"); // "auto" | "manual"
  const [designUrl, setDesignUrl] = useState("");
  const [layout, setLayout] = useState(() => ({ ...DEFAULT_CERT_LAYOUT }));
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [qrPreviewUrl, setQrPreviewUrl] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [savingCert, setSavingCert] = useState(false);
  const genSeqRef = useRef(0);

  const load = () => api.get("/certificates/all").then((r) => setCerts(r.data));

  useEffect(() => {
    load();
    api
      .get("/admin/certificate-template")
      .then((r) => {
        if (r.data?.design_url) setDesignUrl(r.data.design_url);
        if (r.data?.layout) setLayout((prev) => ({ ...prev, ...r.data.layout }));
      })
      .catch(() => {});
  }, []);

  const persistTemplate = async (nextDesign, nextLayout = layout) => {
    try {
      setSavingTemplate(true);
      await api.put("/admin/certificate-template", {
        design_url: nextDesign,
        layout: nextLayout,
      });
      toast.success(nextDesign ? "Certificate design saved" : "Reverted to default template");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "Could not save design");
    } finally {
      setSavingTemplate(false);
    }
  };

  const onUploadDesign = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      toast.error("Design image too large (max 6MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const next = String(reader.result || "");
      setDesignUrl(next);
      persistTemplate(next, layout);
    };
    reader.onerror = () => toast.error("Failed to read design file");
    reader.readAsDataURL(file);
  };

  // Auto-generate Certificate + QR canvas preview whenever fields/design/layout change in "auto" mode
  useEffect(() => {
    if (!editing || studioMode !== "auto") return;
    const seq = ++genSeqRef.current;
    const code = editing.certificate_code || editing.payout_id || generateCertificateCode();
    const verifyUrl = buildVerificationUrl(code);
    setGenerating(true);
    const timer = setTimeout(async () => {
      try {
        const result = await generateCertificateImage({
          designImageUrl: designUrl,
          traderName: editing.trader_name,
          amount: editing.amount,
          payoutDate: editing.payout_date,
          plan: editing.plan,
          accountSize: editing.account_size,
          certificateCode: code,
          payoutId: editing.payout_id,
          verificationUrl: verifyUrl,
          layout,
        });
        if (seq !== genSeqRef.current) return;
        setQrPreviewUrl(result.qrDataUrl);
        setEditing((prev) =>
          prev
            ? {
                ...prev,
                certificate_code: code,
                verification_url: verifyUrl,
                image_url: result.imageDataUrl,
                template_used: true,
              }
            : prev,
        );
      } catch {
        // Fallback QR only if canvas generation fails
        try {
          const qr = await generateQrDataUrl(verifyUrl, 300);
          if (seq === genSeqRef.current) setQrPreviewUrl(qr);
        } catch {
          // ignore
        }
      } finally {
        if (seq === genSeqRef.current) setGenerating(false);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [
    editing?.trader_name,
    editing?.amount,
    editing?.payout_date,
    editing?.plan,
    editing?.account_size,
    editing?.certificate_code,
    editing?.payout_id,
    Boolean(editing),
    studioMode,
    designUrl,
    layout,
  ]);

  const openNew = () => {
    setStudioMode("auto");
    setEditing(emptyCert());
  };

  const openEdit = (c) => {
    const code = c.certificate_code || generateCertificateCode();
    setStudioMode(c.template_used ? "auto" : "manual");
    setEditing({
      ...emptyCert(),
      ...c,
      certificate_code: code,
    });
    generateQrDataUrl(buildVerificationUrl(code), 300)
      .then(setQrPreviewUrl)
      .catch(() => {});
  };

  const save = async () => {
    if (!editing) return;
    try {
      setSavingCert(true);
      const code = String(editing.certificate_code || generateCertificateCode())
        .trim()
        .toUpperCase();
      const verification_url = buildVerificationUrl(code);
      let finalImageUrl = editing.image_url;

      if (studioMode === "auto") {
        const rendered = await generateCertificateImage({
          designImageUrl: designUrl,
          traderName: editing.trader_name,
          amount: editing.amount,
          payoutDate: editing.payout_date,
          plan: editing.plan,
          accountSize: editing.account_size,
          certificateCode: code,
          payoutId: editing.payout_id,
          verificationUrl: verification_url,
          layout,
        });
        finalImageUrl = rendered.imageDataUrl;
        // Persist latest layout tweaks alongside template
        api.put("/admin/certificate-template", { design_url: designUrl, layout }).catch(() => {});
      }

      if (!finalImageUrl) {
        toast.error("Please upload or generate a certificate image");
        return;
      }

      const payload = {
        ...editing,
        certificate_code: code,
        verification_url,
        image_url: finalImageUrl,
        template_used: studioMode === "auto",
      };

      if (editing.id) await api.put(`/certificates/${editing.id}`, payload);
      else await api.post("/certificates", payload);
      toast.success("Certificate & QR saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    } finally {
      setSavingCert(false);
    }
  };

  const del = async (id) => {
    try {
      await api.delete(`/certificates/${id}`);
      toast.success("Deleted");
      setConfirmDeleteId(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };

  const analyzeCurrent = async () => {
    if (!editing?.image_url || !editing.image_url.startsWith("data:image/")) {
      toast.error("Upload an image first (URLs cannot be analyzed)");
      return;
    }
    try {
      setAnalyzing(true);
      const { data } = await api.post("/admin/certificates/analyze", {
        data_url: editing.image_url,
      });
      let payout_date = data.date || "";
      if (payout_date && /^\d{4}-\d{2}-\d{2}$/.test(payout_date)) {
        const [y, m, d] = payout_date.split("-");
        payout_date = `${d}/${m}/${y}`;
      }
      setEditing((prev) => ({
        ...prev,
        trader_name: data.name || prev.trader_name,
        amount: data.amount ? Number(data.amount) : prev.amount,
        payout_date: payout_date || prev.payout_date,
        plan: data.plan || prev.plan,
      }));
      toast.success("AI extracted details — please review");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || "AI analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setEditing((prev) => ({ ...prev, image_url: reader.result }));
      setUploading(false);
      toast.success("Image loaded");
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-8">
        <div>
          <div className="chip mb-3">Last Week Payouts · QR Verification</div>
          <h1 className="font-display text-4xl">Payout Certificates</h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">
            Upload your certificate design once. Enter trader name, payout amount and date to
            automatically stamp a scannable verification QR code and generate the certificate.
          </p>
        </div>
        <button
          onClick={openNew}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="cert-new-btn"
        >
          <QrCode size={16} /> Generate QR Certificate
        </button>
      </div>

      {/* Saved Reusable Certificate Design Card */}
      <div className="card-panel p-5 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {designUrl ? (
            <img
              src={designUrl}
              alt="Saved certificate design"
              className="w-24 h-16 object-cover rounded-lg border border-[var(--border-hi)] shrink-0"
            />
          ) : (
            <div className="w-24 h-16 rounded-lg border border-dashed border-[var(--border-hi)] bg-white/[0.03] grid place-items-center text-[11px] font-mono text-[var(--muted-2)] shrink-0">
              Default Gold
            </div>
          )}
          <div>
            <div className="font-display text-base">Master Certificate Design</div>
            <div className="text-xs text-[var(--muted)] mt-0.5">
              {designUrl
                ? "Custom design active — automatically applied to every generated certificate."
                : "Using built-in dark & gold certificate frame. Upload your own blank certificate design below."}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <label
            className="btn-amber rounded-full px-4 py-2 text-xs inline-flex items-center gap-2 cursor-pointer"
            data-testid="cert-template-upload-btn"
          >
            <Upload size={14} />
            {savingTemplate ? "Saving…" : designUrl ? "Change Design" : "Upload Design"}
            <input type="file" accept="image/*" onChange={onUploadDesign} className="hidden" />
          </label>
          {designUrl && (
            <button
              type="button"
              onClick={() => {
                setDesignUrl("");
                persistTemplate("", layout);
              }}
              className="btn-ghost rounded-full px-3.5 py-2 text-xs text-[var(--rose)]"
            >
              Reset Default
            </button>
          )}
        </div>
      </div>

      <div className="card-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Certificate</TableHead>
              <TableHead>QR / Verify ID</TableHead>
              <TableHead>Trader</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certs.map((c) => (
              <TableRow
                key={c.id}
                className="border-[var(--border)]"
                data-testid={`cert-row-${c.id}`}
              >
                <TableCell>
                  <img
                    src={c.image_url}
                    alt=""
                    className="w-20 h-14 object-cover rounded-md border border-[var(--border)]"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs">
                  <div className="text-white">{c.certificate_code || "—"}</div>
                  {c.payout_id && (
                    <div className="text-[11px] text-[var(--muted-2)] mt-0.5">{c.payout_id}</div>
                  )}
                </TableCell>
                <TableCell className="font-display">{c.trader_name || "—"}</TableCell>
                <TableCell>{c.plan || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {c.amount ? formatINR(c.amount) : "—"}
                </TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {c.payout_date || "—"}
                </TableCell>
                <TableCell>{c.visible ? "✓" : "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {c.image_url && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadDataUrl(
                          c.image_url,
                          `${c.certificate_code || c.trader_name || "certificate"}.png`,
                        )
                      }
                      className="btn-ghost px-2.5 py-1.5 rounded-md mr-1"
                      title="Download Certificate"
                    >
                      <Download size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => openEdit(c)}
                    className="btn-ghost px-2.5 py-1.5 rounded-md mr-1"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  {confirmDeleteId === c.id ? (
                    <span className="inline-flex items-center gap-1 ml-1">
                      <button
                        type="button"
                        onClick={() => del(c.id)}
                        className="px-2.5 py-1 rounded text-xs bg-[rgba(239,68,68,0.18)] text-[var(--rose)]"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2 py-1 rounded text-xs text-[var(--muted)] hover:text-white"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(c.id)}
                      className="btn-ghost px-2.5 py-1.5 rounded-md text-[var(--rose)]"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <DialogTitle className="font-display text-2xl">
                {editing?.id ? "Edit Payout Certificate" : "Auto-Generate QR Payout Certificate"}
              </DialogTitle>
              <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.05] border border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setStudioMode("auto")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    studioMode === "auto"
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Auto Generator + QR
                </button>
                <button
                  type="button"
                  onClick={() => setStudioMode("manual")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    studioMode === "manual"
                      ? "bg-[var(--accent)] text-black"
                      : "text-[var(--muted)] hover:text-white"
                  }`}
                >
                  Manual Image / URL
                </button>
              </div>
            </div>
          </DialogHeader>

          {editing && (
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-6 mt-2">
              {/* Left side: Details & Layout */}
              <div className="space-y-4">
                {studioMode === "auto" ? (
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
                    <div className="text-xs text-[var(--muted)]">
                      {designUrl
                        ? "Active design: Custom uploaded template"
                        : "Active design: IndiFunded Gold Template"}
                    </div>
                    <label className="btn-ghost rounded-full px-3.5 py-1.5 text-xs border border-[var(--border-hi)] inline-flex items-center gap-1.5 cursor-pointer">
                      <Upload size={13} /> Upload Certificate Design
                      <input
                        type="file"
                        accept="image/*"
                        onChange={onUploadDesign}
                        className="hidden"
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <Label>Certificate Image</Label>
                    <div className="mt-2 flex items-center gap-3">
                      <label
                        className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer"
                        data-testid="cert-upload-btn"
                      >
                        <Upload size={14} /> {uploading ? "Loading…" : "Upload from device"}
                        <input type="file" accept="image/*" onChange={onFile} className="hidden" />
                      </label>
                      {editing.image_url?.startsWith("data:image/") && (
                        <button
                          type="button"
                          onClick={analyzeCurrent}
                          disabled={analyzing}
                          className="btn-ghost rounded-full px-3.5 py-2 text-xs border border-[var(--border-hi)] inline-flex items-center gap-1.5"
                          data-testid="cert-analyze-btn"
                        >
                          {analyzing ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Sparkles size={13} />
                          )}
                          Auto-Detect (AI)
                        </button>
                      )}
                    </div>
                    <Input
                      value={editing.image_url?.startsWith("data:") ? "" : editing.image_url}
                      onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                      placeholder="https://… or /certificates/cert-1.png"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Trader Name</Label>
                    <Input
                      value={editing.trader_name}
                      onChange={(e) => setEditing({ ...editing, trader_name: e.target.value })}
                      placeholder="e.g. Aarav Sharma"
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                      data-testid="cert-trader-name-input"
                    />
                  </div>
                  <div>
                    <Label>Payout Amount (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editing.amount}
                      onChange={(e) => setEditing({ ...editing, amount: +e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                      data-testid="cert-amount-input"
                    />
                  </div>
                  <div>
                    <Label>Plan (Starter/Pro/Elite)</Label>
                    <Input
                      value={editing.plan}
                      onChange={(e) => setEditing({ ...editing, plan: e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Account Size (₹)</Label>
                    <Input
                      type="number"
                      value={editing.account_size}
                      onChange={(e) => setEditing({ ...editing, account_size: +e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Payout Date (DD/MM/YYYY)</Label>
                    <Input
                      value={editing.payout_date}
                      onChange={(e) => setEditing({ ...editing, payout_date: e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Payout ID (Optional)</Label>
                    <Input
                      value={editing.payout_id || ""}
                      onChange={(e) =>
                        setEditing({ ...editing, payout_id: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g. PO-1042"
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5 font-mono"
                    />
                  </div>
                  <div>
                    <Label>QR Certificate Code</Label>
                    <div className="flex gap-1.5 mt-1.5">
                      <Input
                        value={editing.certificate_code || ""}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            certificate_code: e.target.value.toUpperCase(),
                          })
                        }
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] font-mono"
                        data-testid="cert-code-input"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({ ...editing, certificate_code: generateCertificateCode() })
                        }
                        className="px-2.5 rounded-md border border-[var(--border-hi)] hover:bg-white/5"
                        title="Generate new QR code ID"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <Label>UTR Last 4 Digits (Optional)</Label>
                    <Input
                      value={editing.utr_last4 || ""}
                      maxLength={4}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          utr_last4: e.target.value.replace(/[^0-9a-z]/gi, "").slice(0, 4),
                        })
                      }
                      placeholder="1234"
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5 font-mono"
                    />
                  </div>
                </div>

                {studioMode === "auto" && (
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-white/[0.02] space-y-3">
                    <div className="text-xs font-medium text-white flex items-center justify-between">
                      <span>QR & Text Placement</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setLayout((l) => ({ ...l, overlayMode: "details_and_qr" }))
                          }
                          className={`px-2.5 py-1 rounded text-[11px] ${
                            layout.overlayMode !== "qr_only"
                              ? "bg-[var(--accent)] text-black font-medium"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          Details + QR
                        </button>
                        <button
                          type="button"
                          onClick={() => setLayout((l) => ({ ...l, overlayMode: "qr_only" }))}
                          className={`px-2.5 py-1 rounded text-[11px] ${
                            layout.overlayMode === "qr_only"
                              ? "bg-[var(--accent)] text-black font-medium"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          QR Stamp Only
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[var(--muted-2)]">QR Corner</span>
                        <select
                          value={layout.qrCorner}
                          onChange={(e) => setLayout((l) => ({ ...l, qrCorner: e.target.value }))}
                          className="w-full mt-1 rounded-md bg-[var(--bg-1)] border border-[var(--border-hi)] px-2.5 py-1.5 text-white"
                        >
                          <option value="bottom-right">Bottom Right</option>
                          <option value="bottom-left">Bottom Left</option>
                          <option value="top-right">Top Right</option>
                          <option value="top-left">Top Left</option>
                        </select>
                      </div>
                      <div>
                        <span className="text-[var(--muted-2)]">QR Size ({layout.qrSizePct}%)</span>
                        <input
                          type="range"
                          min={11}
                          max={26}
                          value={layout.qrSizePct}
                          onChange={(e) =>
                            setLayout((l) => ({ ...l, qrSizePct: Number(e.target.value) }))
                          }
                          className="w-full mt-2 accent-[var(--accent)]"
                        />
                      </div>
                    </div>

                    {layout.overlayMode !== "qr_only" && (
                      <div className="grid grid-cols-3 gap-2.5 text-xs pt-1">
                        <div>
                          <span className="text-[var(--muted-2)]">Name Y ({layout.nameY}%)</span>
                          <input
                            type="range"
                            min={20}
                            max={85}
                            value={layout.nameY}
                            onChange={(e) =>
                              setLayout((l) => ({ ...l, nameY: Number(e.target.value) }))
                            }
                            className="w-full mt-1.5 accent-[var(--accent)]"
                          />
                        </div>
                        <div>
                          <span className="text-[var(--muted-2)]">
                            Amount Y ({layout.amountY}%)
                          </span>
                          <input
                            type="range"
                            min={25}
                            max={90}
                            value={layout.amountY}
                            onChange={(e) =>
                              setLayout((l) => ({ ...l, amountY: Number(e.target.value) }))
                            }
                            className="w-full mt-1.5 accent-[var(--accent)]"
                          />
                        </div>
                        <div>
                          <span className="text-[var(--muted-2)]">Meta Y ({layout.metaY}%)</span>
                          <input
                            type="range"
                            min={30}
                            max={92}
                            value={layout.metaY}
                            onChange={(e) =>
                              setLayout((l) => ({ ...l, metaY: Number(e.target.value) }))
                            }
                            className="w-full mt-1.5 accent-[var(--accent)]"
                          />
                        </div>
                        <div className="col-span-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--muted-2)]">Text Ink:</span>
                            {[
                              { label: "White", color: "#f8fafc" },
                              { label: "Dark", color: "#0f172a" },
                              { label: "Gold", color: "#fde68a" },
                            ].map((opt) => (
                              <button
                                key={opt.color}
                                type="button"
                                onClick={() => setLayout((l) => ({ ...l, textColor: opt.color }))}
                                className={`px-2 py-0.5 rounded border text-[11px] ${
                                  layout.textColor === opt.color
                                    ? "border-[var(--accent)] text-white"
                                    : "border-[var(--border)] text-[var(--muted)]"
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setLayout((l) => ({ ...l, textAlign: "center" }))}
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                layout.textAlign !== "left"
                                  ? "bg-white/15 text-white"
                                  : "text-[var(--muted)]"
                              }`}
                            >
                              Center
                            </button>
                            <button
                              type="button"
                              onClick={() => setLayout((l) => ({ ...l, textAlign: "left" }))}
                              className={`px-2 py-0.5 rounded text-[11px] ${
                                layout.textAlign === "left"
                                  ? "bg-white/15 text-white"
                                  : "text-[var(--muted)]"
                              }`}
                            >
                              Left
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.visible}
                      onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                    />{" "}
                    Visible on website & payout verification
                  </label>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[var(--muted-2)]">Order</span>
                    <Input
                      type="number"
                      value={editing.order}
                      onChange={(e) => setEditing({ ...editing, order: +e.target.value })}
                      className="w-16 bg-[var(--bg-1)] border-[var(--border-hi)] h-8"
                    />
                  </div>
                </div>
              </div>

              {/* Right side: Live Auto-Generated Certificate Preview & QR Code */}
              <div className="space-y-4">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-3">
                  <div className="flex items-center justify-between text-xs text-[var(--muted-2)] mb-2">
                    <span>Live Certificate Preview</span>
                    {generating && (
                      <span className="inline-flex items-center gap-1 text-[var(--accent)]">
                        <Loader2 size={12} className="animate-spin" /> Rendering…
                      </span>
                    )}
                  </div>
                  {editing.image_url ? (
                    <img
                      src={editing.image_url}
                      alt="Generated payout certificate preview"
                      className="w-full rounded-lg border border-[var(--border)] object-contain max-h-80 bg-black/40"
                      data-testid="cert-live-preview"
                    />
                  ) : (
                    <div className="h-56 grid place-items-center text-xs text-[var(--muted-2)] border border-dashed border-[var(--border)] rounded-lg">
                      Certificate preview will appear here
                    </div>
                  )}
                  {editing.image_url && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() =>
                          downloadDataUrl(
                            editing.image_url,
                            `${editing.certificate_code || "payout-certificate"}.png`,
                          )
                        }
                        className="btn-ghost rounded-full px-3.5 py-1.5 text-xs border border-[var(--border-hi)] inline-flex items-center gap-1.5"
                      >
                        <Download size={13} /> Download Certificate PNG
                      </button>
                      {qrPreviewUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            downloadDataUrl(
                              qrPreviewUrl,
                              `${editing.certificate_code || "payout-qr"}.png`,
                            )
                          }
                          className="btn-ghost rounded-full px-3.5 py-1.5 text-xs border border-[var(--border-hi)] inline-flex items-center gap-1.5"
                        >
                          <QrCode size={13} /> Download QR Only
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {qrPreviewUrl && (
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-3.5 flex items-center gap-4">
                    <img
                      src={qrPreviewUrl}
                      alt="Verification QR Code"
                      className="w-20 h-20 rounded-md bg-white p-1 shrink-0"
                    />
                    <div className="min-w-0 text-xs space-y-1">
                      <div className="font-medium text-white">Verification QR Ready</div>
                      <div className="font-mono text-[var(--accent)]">
                        {editing.certificate_code}
                      </div>
                      <div className="text-[var(--muted-2)] break-all text-[11px]">
                        {buildVerificationUrl(editing.certificate_code)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-ghost rounded-full px-5 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={savingCert}
              className="btn-amber rounded-full px-6 py-2.5 text-sm inline-flex items-center gap-2"
              data-testid="cert-save-btn"
            >
              {savingCert && <Loader2 size={14} className="animate-spin" />}
              Save & Publish Certificate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Payout Requests =====
const payoutStatusMap = {
  pending: { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
  approved: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", label: "Approved" },
  paid: { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Paid" },
  rejected: { bg: "rgba(239,68,68,0.15)", text: "#f87171", label: "Rejected" },
};

export function AdminPayoutRequests() {
  const [rows, setRows] = useState([]);
  const [view, setView] = useState(null);
  const load = () => api.get("/payout-requests").then((r) => setRows(r.data));
  useEffect(() => {
    load();
  }, []);
  const setStatus = async (id, status) => {
    try {
      await api.patch(`/payout-requests/${id}`, { status });
      toast.success(`Marked ${status}`);
      load();
      if (view?.id === id) setView((v) => ({ ...v, status }));
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const saveNote = async () => {
    try {
      await api.patch(`/payout-requests/${view.id}`, { admin_note: view.admin_note || "" });
      toast.success("Note saved");
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete payout request?")) return;
    await api.delete(`/payout-requests/${id}`);
    toast.success("Deleted");
    if (view?.id === id) setView(null);
    load();
  };

  const Badge = ({ s }) => {
    const c = payoutStatusMap[s] || payoutStatusMap.pending;
    return (
      <span
        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-mono uppercase tracking-wider"
        style={{ background: c.bg, color: c.text }}
      >
        {c.label}
      </span>
    );
  };

  return (
    <div>
      <div className="chip mb-3">Trader Payouts</div>
      <h1 className="font-display text-4xl mb-10">Payout Requests</h1>
      <div className="card-panel overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Trader</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={7} className="text-center text-[var(--muted)] py-10">
                  No payout requests yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="border-[var(--border)]"
                data-testid={`payout-row-${r.id}`}
              >
                <TableCell className="font-display">{r.full_name}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {r.email}
                  <br />
                  {r.phone}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {r.account_id || "—"}
                  <br />
                  {r.plan || ""}
                </TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {formatINR(r.amount)}
                </TableCell>
                <TableCell className="uppercase text-xs font-mono">{r.method}</TableCell>
                <TableCell>
                  <Badge s={r.status} />
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <button
                    onClick={() => setView(r)}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2 text-xs"
                  >
                    View
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Payout Request</DialogTitle>
          </DialogHeader>
          {view && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-display text-xl">{view.full_name}</div>
                  <div className="text-xs text-[var(--muted)] font-mono mt-1">
                    {new Date(view.created_at).toLocaleString()}
                  </div>
                </div>
                <Badge s={view.status} />
              </div>
              <div className="grid md:grid-cols-2 gap-3 text-sm">
                <Info label="Email" value={view.email} />
                <Info label="Phone" value={view.phone} />
                <Info label="Funded Account ID" value={view.account_id || "—"} />
                <Info label="Plan" value={view.plan || "—"} />
                <Info label="Amount" value={formatINR(view.amount)} accent />
                <Info label="Method" value={view.method?.toUpperCase()} />
              </div>
              {view.method === "upi" ? (
                <Info label="UPI ID" value={view.upi_id || "—"} mono />
              ) : (
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <Info label="Account Holder" value={view.account_holder || "—"} />
                  <Info label="Bank Name" value={view.bank_name || "—"} />
                  <Info label="Account Number" value={view.account_number || "—"} mono />
                  <Info label="IFSC" value={view.ifsc || "—"} mono />
                </div>
              )}
              {view.notes && <Info label="Trader Notes" value={view.notes} />}
              <div>
                <Label>Admin Note (internal)</Label>
                <Textarea
                  value={view.admin_note || ""}
                  onChange={(e) => setView({ ...view, admin_note: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  rows={3}
                  placeholder="Verification notes, UTR of transfer, etc."
                />
                <button
                  onClick={saveNote}
                  className="btn-ghost rounded-full px-4 py-2 text-xs mt-2"
                >
                  Save note
                </button>
              </div>
              <div className="border-t border-[var(--border)] pt-4">
                <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)] mb-3">
                  Change status
                </div>
                <div className="flex flex-wrap gap-2">
                  {["pending", "approved", "paid", "rejected"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(view.id, s)}
                      className={`rounded-full px-4 py-2 text-xs uppercase font-mono tracking-wider ${view.status === s ? "btn-amber" : "btn-ghost"}`}
                      data-testid={`payout-status-${s}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, mono, accent }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider font-mono text-[var(--muted-2)]">
        {label}
      </div>
      <div
        className={`mt-1 ${mono ? "font-mono text-sm" : "text-sm"} ${accent ? "text-[var(--accent)] font-display text-lg" : "text-white"}`}
      >
        {value}
      </div>
    </div>
  );
}

export function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const load = () => api.get("/orders").then((r) => setOrders(r.data));
  useEffect(() => {
    load();
  }, []);
  const setStatus = async (id, status) => {
    try {
      await api.patch(`/orders/${id}/status?status=${status}`);
      toast.success(`Marked ${status}`);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete order?")) return;
    await api.delete(`/orders/${id}`);
    toast.success("Deleted");
    load();
  };

  const statusBadge = (s) => {
    const map = {
      pending_verification: { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      completed: { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Verified" },
      rejected: { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending_verification"];
    return (
      <span
        className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: m.bg, color: m.text }}
      >
        {m.label}
      </span>
    );
  };

  return (
    <div>
      <div className="chip mb-3">Orders</div>
      <h1 className="font-display text-4xl">Orders ({orders.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        Verify UPI transactions. Match the UTR in your bank statement before approving.
      </p>
      <div className="card-panel overflow-hidden mt-10">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Customer</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>UTR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o) => (
              <TableRow
                key={o.id}
                className="border-[var(--border)]"
                data-testid={`order-row-${o.id}`}
              >
                <TableCell>
                  <div>{o.customer_name || "—"}</div>
                  <div className="text-xs text-[var(--muted-2)]">{o.customer_email}</div>
                  <div className="text-xs text-[var(--muted-2)] font-mono">{o.customer_phone}</div>
                </TableCell>
                <TableCell>{o.plan_name}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {formatINR(o.amount)}
                </TableCell>
                <TableCell className="font-mono text-xs">{o.utr || "—"}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {new Date(o.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {o.status === "pending_verification" && (
                    <>
                      <button
                        onClick={() => setStatus(o.id, "completed")}
                        className="btn-amber rounded-full px-3 py-1.5 text-xs mr-2"
                        data-testid={`order-approve-${o.id}`}
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => setStatus(o.id, "rejected")}
                        className="btn-ghost rounded-full px-3 py-1.5 text-xs mr-2 text-[var(--rose)]"
                        data-testid={`order-reject-${o.id}`}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => del(o.id)}
                    className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Coupons =====
const emptyCoupon = {
  code: "",
  discount_percent: 10,
  active: true,
  max_uses: null,
  expires_at: "",
  description: "",
};

export function AdminCoupons() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () =>
    api
      .get("/coupons")
      .then((r) => setRows(r.data))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    try {
      const body = { ...editing, code: editing.code?.trim().toUpperCase() };
      if (!body.code) {
        toast.error("Code is required");
        return;
      }
      if (editing.id) await api.put(`/coupons/${editing.id}`, body);
      else await api.post("/coupons", body);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete coupon?")) return;
    await api.delete(`/coupons/${id}`);
    toast.success("Deleted");
    load();
  };
  return (
    <div>
      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div>
          <div className="chip mb-3">Discount Codes</div>
          <h1 className="font-display text-4xl">Coupons</h1>
        </div>
        <button
          onClick={() => setEditing({ ...emptyCoupon })}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="coupon-new-btn"
        >
          <Plus size={16} /> New Coupon
        </button>
      </div>
      <div className="card-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="border-[var(--border)]"
                data-testid={`coupon-row-${r.id}`}
              >
                <TableCell className="font-mono text-white">{r.code}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {r.discount_percent}%
                </TableCell>
                <TableCell className="text-sm">
                  {r.used_count || 0}
                  {r.max_uses ? ` / ${r.max_uses}` : ""}
                </TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {r.expires_at ? r.expires_at.slice(0, 10) : "—"}
                </TableCell>
                <TableCell>{r.active ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setEditing(r)}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing?.id ? "Edit Coupon" : "New Coupon"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Code</Label>
                <Input
                  value={editing.code}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. LAUNCH20"
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono tracking-wider"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Discount %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="90"
                    value={editing.discount_percent}
                    onChange={(e) => setEditing({ ...editing, discount_percent: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Max Uses (blank = unlimited)</Label>
                  <Input
                    type="number"
                    value={editing.max_uses ?? ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        max_uses: e.target.value === "" ? null : +e.target.value,
                      })
                    }
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
              </div>
              <div>
                <Label>Expires At (YYYY-MM-DD, optional)</Label>
                <Input
                  type="date"
                  value={editing.expires_at || ""}
                  onChange={(e) => setEditing({ ...editing, expires_at: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Description (internal)</Label>
                <Input
                  value={editing.description || ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.active}
                  onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                />{" "}
                Active
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={save}
              className="btn-amber rounded-full px-6 py-2.5 text-sm"
              data-testid="coupon-save-btn"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Leaderboard =====
const emptyLB = {
  name: "",
  plan: "Standard",
  total_payout: 0,
  city: "",
  avatar_url: "",
  verified: true,
  rank_note: "",
};

export function AdminLeaderboard() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const load = () =>
    api
      .get("/leaderboard?limit=100")
      .then((r) => setRows(r.data))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    try {
      if (!editing.name) {
        toast.error("Name required");
        return;
      }
      if (editing.id) await api.put(`/leaderboard/${editing.id}`, editing);
      else await api.post("/leaderboard", editing);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete entry?")) return;
    await api.delete(`/leaderboard/${id}`);
    toast.success("Deleted");
    load();
  };

  const uploadAvatar = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      toast.error("Image too large (max 3MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setEditing((prev) => ({ ...prev, avatar_url: reader.result }));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10 flex-wrap gap-4">
        <div>
          <div className="chip mb-3">Top Traders</div>
          <h1 className="font-display text-4xl">Leaderboard</h1>
        </div>
        <button
          onClick={() => setEditing({ ...emptyLB })}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="lb-new-btn"
        >
          <Plus size={16} /> New Entry
        </button>
      </div>
      <div className="card-panel overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>#</TableHead>
              <TableHead>Avatar</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Total Payout</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow
                key={r.id}
                className="border-[var(--border)]"
                data-testid={`lb-row-${r.id}`}
              >
                <TableCell className="font-mono text-[var(--muted-2)]">{i + 1}</TableCell>
                <TableCell>
                  {r.avatar_url ? (
                    <img
                      src={r.avatar_url}
                      alt=""
                      className="w-10 h-10 object-cover rounded-full border border-[var(--border)]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--bg-2)] border border-[var(--border)]" />
                  )}
                </TableCell>
                <TableCell className="font-display">{r.name}</TableCell>
                <TableCell>{r.plan}</TableCell>
                <TableCell className="text-sm text-[var(--muted)]">{r.city || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {formatINR(r.total_payout)}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setEditing(r)}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del(r.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing?.id ? "Edit Entry" : "New Entry"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                />
              </div>
              <div>
                <Label>Avatar Photo</Label>
                <div className="mt-2 flex items-center gap-3">
                  <label className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={14} /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadAvatar}
                      className="hidden"
                    />
                  </label>
                  {editing.avatar_url && (
                    <img
                      src={editing.avatar_url}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border)]"
                    />
                  )}
                  {editing.avatar_url && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, avatar_url: "" })}
                      className="btn-ghost rounded-full px-3 py-2 text-xs text-[var(--rose)]"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan</Label>
                  <Input
                    value={editing.plan}
                    onChange={(e) => setEditing({ ...editing, plan: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>City</Label>
                  <Input
                    value={editing.city}
                    onChange={(e) => setEditing({ ...editing, city: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Total Payout (₹)</Label>
                  <Input
                    type="number"
                    value={editing.total_payout}
                    onChange={(e) => setEditing({ ...editing, total_payout: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Rank Note (optional)</Label>
                  <Input
                    value={editing.rank_note}
                    onChange={(e) => setEditing({ ...editing, rank_note: e.target.value })}
                    placeholder="Rising Star"
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.verified}
                  onChange={(e) => setEditing({ ...editing, verified: e.target.checked })}
                />{" "}
                Verified badge
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={save}
              className="btn-amber rounded-full px-6 py-2.5 text-sm"
              data-testid="lb-save-btn"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Referrals =====
export function AdminReferrals() {
  const [rows, setRows] = useState([]);
  const load = () =>
    api
      .get("/admin/referrals")
      .then((r) => setRows(r.data))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const del = async (id) => {
    if (!window.confirm("Delete referral?")) return;
    await api.delete(`/admin/referrals/${id}`);
    toast.success("Deleted");
    load();
  };
  return (
    <div>
      <div className="chip mb-3">Referral Program</div>
      <h1 className="font-display text-4xl">Referrals ({rows.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        All users who have generated a referral code.
      </p>
      <div className="card-panel overflow-x-auto mt-10">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Referrals</TableHead>
              <TableHead>Earnings</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="border-[var(--border)]"
                data-testid={`ref-row-${r.id}`}
              >
                <TableCell className="font-mono text-[var(--accent)]">{r.code}</TableCell>
                <TableCell>{r.name}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">{r.email}</TableCell>
                <TableCell className="font-mono">{r.referrals_count || 0}</TableCell>
                <TableCell className="font-mono">₹{r.earnings || 0}</TableCell>
                <TableCell className="text-xs text-[var(--muted-2)]">
                  {r.created_at?.slice(0, 10)}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => del(r.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Trader League =====
export function AdminLeague() {
  const [config, setConfig] = useState({ enabled: false, fee_existing: 999, fee_new: 1499 });
  const [rows, setRows] = useState([]);
  const load = async () => {
    try {
      const c = await api.get("/league/config");
      setConfig(c.data);
      const r = await api.get("/league/registrations");
      setRows(r.data);
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  useEffect(() => {
    load();
  }, []);
  const toggle = async () => {
    try {
      const { data } = await api.put("/league/config", { enabled: !config.enabled });
      setConfig({ ...config, enabled: data.enabled });
      toast.success(data.enabled ? "Registration is now OPEN" : "Registration is now CLOSED");
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this registration?")) return;
    await api.delete(`/league/registrations/${id}`);
    toast.success("Deleted");
    load();
  };
  const statusBadge = (s) => {
    const map = {
      pending_payment: { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      completed: { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Paid" },
      rejected: { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map["pending_payment"];
    return (
      <span
        className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: m.bg, color: m.text }}
      >
        {m.label}
      </span>
    );
  };

  const paidCount = rows.filter((r) => r.status === "completed").length;
  const totalRevenue = rows
    .filter((r) => r.status === "completed")
    .reduce((a, r) => a + (r.amount || 0), 0);

  return (
    <div>
      <div className="chip mb-3">
        <Trophy size={12} /> Trader League
      </div>
      <h1 className="font-display text-4xl">Trader League</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        Manage league registration availability and view sign-ups.
      </p>

      <div className="grid md:grid-cols-3 gap-4 mt-8">
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">
            Public Registration
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span
              className={`text-lg font-display ${config.enabled ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}
            >
              {config.enabled ? "OPEN" : "CLOSED"}
            </span>
            <button
              onClick={toggle}
              className={`rounded-full px-4 py-2 text-xs font-mono uppercase tracking-wider ${config.enabled ? "btn-ghost" : "btn-amber"}`}
              data-testid="admin-league-toggle"
            >
              {config.enabled ? "Turn OFF" : "Turn ON"}
            </button>
          </div>
          <p className="text-[11px] text-[var(--muted-2)] mt-3 leading-relaxed">
            Turn OFF to hide the /league page and reject new sign-ups. Existing registrations remain
            intact.
          </p>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">
            Paid Registrations
          </div>
          <div className="font-display text-4xl mt-3 text-[var(--accent)]">{paidCount}</div>
          <div className="text-[11px] text-[var(--muted-2)] mt-2">out of {rows.length} total</div>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs uppercase tracking-widest font-mono text-[var(--muted-2)]">
            Revenue Collected
          </div>
          <div className="font-display text-4xl mt-3">{formatINR(totalRevenue)}</div>
          <div className="text-[11px] text-[var(--muted-2)] mt-2">
            Existing {formatINR(config.fee_existing)} · New {formatINR(config.fee_new)}
          </div>
        </div>
      </div>

      <div className="card-panel overflow-hidden mt-8">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Trader</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Trader ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.id}
                className="border-[var(--border)]"
                data-testid={`league-row-${r.id}`}
              >
                <TableCell>
                  <div>{r.full_name}</div>
                  <div className="text-xs text-[var(--muted-2)]">{r.email}</div>
                  <div className="text-xs text-[var(--muted-2)] font-mono">{r.phone}</div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-mono uppercase tracking-wider">
                    {r.is_existing_trader ? "Existing" : "New"}
                  </span>
                </TableCell>
                <TableCell className="font-mono text-xs">{r.trader_id || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {formatINR(r.amount)}
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {new Date(r.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => del(r.id)}
                    className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex"
                    data-testid={`league-delete-${r.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={7} className="text-center text-[var(--muted)] py-8">
                  No registrations yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ===== Admin Users =====
export function AdminUsers() {
  const [rows, setRows] = useState([]);
  const [fundingUser, setFundingUser] = useState(null);
  const [ledger, setLedger] = useState({ accounts: [], transactions: [] });
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [tab, setTab] = useState("credit");
  const [saving, setSaving] = useState(false);
  const [sendingWelcomeId, setSendingWelcomeId] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState("");

  const [fundForm, setFundForm] = useState({
    account_id: "",
    type: "credit",
    amount: 50000,
    note: "",
  });

  const [acctForm, setAcctForm] = useState({
    account_type: "Funded",
    plan_name: "Funded Pro",
    starting_capital: 300000,
    profit_split: 70,
    max_loss_limit: 20,
    trades_per_day: 10,
    note: "",
  });

  const [evalForm, setEvalForm] = useState({
    account_id: "",
    status: "Active",
    profit_target_pct: 8,
    max_loss_limit: 20,
    daily_loss_limit_pct: 5,
    min_trading_days: 10,
    total_trading_days: 30,
    trades_per_day: 5,
    profit_accuracy_pct: 70,
    profit_split: 70,
    trading_days_done: "",
    days_elapsed: "",
  });

  const syncEvalFormFromAccount = (acct) => {
    if (!acct) return;
    setEvalForm({
      account_id: acct.id,
      status: acct.status || "Active",
      profit_target_pct: acct.profit_target_pct ?? 8,
      max_loss_limit: acct.max_loss_limit ?? 20,
      daily_loss_limit_pct: acct.daily_loss_limit_pct ?? 5,
      min_trading_days: acct.min_trading_days ?? 10,
      total_trading_days: acct.total_trading_days ?? 30,
      trades_per_day: acct.trades_per_day ?? 5,
      profit_accuracy_pct: acct.profit_accuracy_pct ?? 70,
      profit_split: acct.profit_split ?? 70,
      trading_days_done: acct.trading_days_done ?? "",
      days_elapsed: acct.days_elapsed ?? "",
    });
  };

  const load = () =>
    api
      .get("/admin/users")
      .then((r) => setRows(r.data || []))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const openManageFunds = async (u, initialTab = "credit") => {
    setFundingUser(u);
    setTab(initialTab);
    setLedger({ accounts: u.accounts || [], transactions: [] });
    setFundForm({
      account_id: u.accounts?.[0]?.id || "",
      type: "credit",
      amount: 50000,
      note: "",
    });
    if (u.accounts?.[0]) syncEvalFormFromAccount(u.accounts[0]);
    setLedgerLoading(true);
    try {
      const res = await api.get(`/admin/users/${u.id}/ledger`);
      const accts = res.data?.accounts || [];
      setLedger({ accounts: accts, transactions: res.data?.transactions || [] });
      if (accts[0]?.id) {
        setFundForm((cur) => ({ ...cur, account_id: accts[0].id }));
        syncEvalFormFromAccount(accts[0]);
      }
    } catch {
      // keep existing accounts preview
    } finally {
      setLedgerLoading(false);
    }
  };

  const refreshLedger = async (userId) => {
    const res = await api.get(`/admin/users/${userId}/ledger`);
    const accts = res.data?.accounts || [];
    setLedger({ accounts: accts, transactions: res.data?.transactions || [] });
    if (accts[0]?.id) {
      setFundForm((cur) => ({ ...cur, account_id: cur.account_id || accts[0].id }));
    }
    await load();
  };

  const submitFunds = async (e) => {
    e.preventDefault();
    if (!fundingUser) return;
    if (!fundForm.amount || Number(fundForm.amount) <= 0) {
      toast.error("Enter an amount greater than 0");
      return;
    }
    setSaving(true);
    try {
      await api.post(`/admin/users/${fundingUser.id}/funds`, {
        account_id: fundForm.account_id || undefined,
        type: fundForm.type,
        amount: Number(fundForm.amount),
        note: fundForm.note,
      });
      toast.success(
        `${fundForm.type === "debit" ? "Debited" : "Credited"} ${formatINR(fundForm.amount)}`,
      );
      setFundForm((cur) => ({ ...cur, note: "" }));
      await refreshLedger(fundingUser.id);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Failed to update balance"));
    } finally {
      setSaving(false);
    }
  };

  const submitNewAccount = async (e) => {
    e.preventDefault();
    if (!fundingUser) return;
    if (!acctForm.starting_capital || Number(acctForm.starting_capital) <= 0) {
      toast.error("Capital must be greater than 0");
      return;
    }
    setSaving(true);
    try {
      const res = await api.post(`/admin/users/${fundingUser.id}/accounts`, {
        ...acctForm,
        starting_capital: Number(acctForm.starting_capital),
        profit_split: Number(acctForm.profit_split),
        max_loss_limit: Number(acctForm.max_loss_limit),
        trades_per_day: Number(acctForm.trades_per_day),
      });
      toast.success(
        `Created ${acctForm.account_type} account (${res.data?.account?.account_number || ""})`,
      );
      if (res.data?.account?.id) {
        setFundForm((cur) => ({ ...cur, account_id: res.data.account.id }));
      }
      await refreshLedger(fundingUser.id);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Failed to create account"));
    } finally {
      setSaving(false);
    }
  };

  const submitEvalRisk = async (e) => {
    e.preventDefault();
    if (!fundingUser || !evalForm.account_id) {
      toast.error("Select an account first");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        status: evalForm.status,
        profit_target_pct: Number(evalForm.profit_target_pct),
        max_loss_limit: Number(evalForm.max_loss_limit),
        daily_loss_limit_pct: Number(evalForm.daily_loss_limit_pct),
        min_trading_days: Number(evalForm.min_trading_days),
        total_trading_days: Number(evalForm.total_trading_days),
        trades_per_day: Number(evalForm.trades_per_day),
        profit_accuracy_pct: Number(evalForm.profit_accuracy_pct),
        profit_split: Number(evalForm.profit_split),
      };
      if (evalForm.trading_days_done !== "") {
        payload.trading_days_done = Number(evalForm.trading_days_done);
      }
      if (evalForm.days_elapsed !== "") {
        payload.days_elapsed = Number(evalForm.days_elapsed);
      }
      await api.patch(`/admin/accounts/${evalForm.account_id}`, payload);
      toast.success("Account evaluation & risk rules updated");
      await refreshLedger(fundingUser.id);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Failed to update account rules"));
    } finally {
      setSaving(false);
    }
  };

  const sendWelcomeToUser = async (u) => {
    setSendingWelcomeId(u.id);
    try {
      const { data } = await api.post(`/admin/users/${u.id}/send-welcome`);
      toast.success(`Welcome email sent to ${data?.to || u.email}`);
      load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Failed to send welcome email"));
    } finally {
      setSendingWelcomeId("");
    }
  };

  const del = async (id) => {
    await api.delete(`/admin/users/${id}`);
    setConfirmDeleteId("");
    toast.success("Trader removed — email can register again cleanly");
    load();
  };

  return (
    <div>
      <div className="chip mb-3">
        <Users size={12} /> Users &amp; Trader Funds
      </div>
      <h1 className="font-display text-4xl">Registered traders ({rows.length})</h1>
      <p className="text-sm text-[var(--muted)] mt-2">
        Credit virtual funds directly into any trader's wallet, provision new funded challenge
        accounts, and inspect account ledgers.
      </p>

      <div className="card-panel overflow-hidden mt-8">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Trader</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Accounts</TableHead>
              <TableHead>Total Balance</TableHead>
              <TableHead>APK Credentials</TableHead>
              <TableHead>KYC</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((u) => (
              <TableRow
                key={u.id}
                className="border-[var(--border)]"
                data-testid={`user-row-${u.id}`}
              >
                <TableCell>
                  <div className="font-medium">{u.name || "—"}</div>
                  <div className="text-[10px] text-[var(--muted-2)] font-mono">
                    {u.id.slice(0, 8)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">{u.email}</div>
                  <div className="font-mono text-xs text-[var(--muted-2)]">{u.phone || "—"}</div>
                  <div className="mt-1">
                    {u.welcome_sent_at ? (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
                        Welcome Sent
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-white/5 text-[var(--muted-2)]">
                        Welcome Pending
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="tabular-nums">
                  <div className="text-xs font-mono">{u.accounts?.length || 0} active</div>
                  {u.funded_accounts_count > 0 && (
                    <div className="text-[10px] font-mono text-[var(--emerald)]">
                      {u.funded_accounts_count} Funded
                    </div>
                  )}
                </TableCell>
                <TableCell className="tabular-nums">
                  <div className="font-mono text-sm text-[var(--accent)] font-semibold">
                    {formatINR(u.total_balance || 0)}
                  </div>
                  <div className="text-[10px] font-mono text-[var(--muted-2)]">
                    Cap {formatINR(u.total_capital || 0)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-mono text-xs">{u.apk_username || u.email}</div>
                  <div className="font-mono text-xs text-[var(--accent)]">
                    {u.apk_password || "—"}
                  </div>
                </TableCell>
                <TableCell>
                  {u.kyc?.submitted_at ? (
                    <span
                      className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(41,211,154,0.15)", color: "#29d39a" }}
                    >
                      Submitted
                    </span>
                  ) : (
                    <span
                      className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full"
                      style={{ background: "rgba(245,182,56,0.15)", color: "#ffd166" }}
                    >
                      Pending
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => sendWelcomeToUser(u)}
                      disabled={sendingWelcomeId === u.id}
                      className="btn-ghost rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                      title="Send Welcome Email from Business Gmail"
                      data-testid={`user-send-welcome-${u.id}`}
                    >
                      {sendingWelcomeId === u.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Mail size={12} />
                      )}
                      {u.welcome_sent_at ? "Resend Mail" : "Send Welcome"}
                    </button>
                    <button
                      onClick={() => openManageFunds(u, "credit")}
                      className="btn-amber rounded-full px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
                      data-testid={`user-funds-${u.id}`}
                    >
                      <Wallet size={13} /> Manage Funds
                    </button>
                    {confirmDeleteId === u.id ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => del(u.id)}
                          className="px-2.5 py-1 rounded-md text-xs bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId("")}
                          className="btn-ghost px-2 py-1 rounded-md text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(u.id)}
                        className="btn-ghost px-2 py-1.5 rounded-md text-[var(--rose)] inline-flex"
                        aria-label={`Delete ${u.name || u.email}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={7} className="text-center text-[var(--muted)] py-8">
                  No users signed up yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!fundingUser} onOpenChange={(o) => !o && setFundingUser(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Trader Funds · {fundingUser?.name || fundingUser?.email}
            </DialogTitle>
          </DialogHeader>

          {fundingUser && (
            <div className="space-y-6 tabular-nums">
              <div className="seg w-full">
                <button
                  type="button"
                  className={`flex-1 inline-flex items-center justify-center gap-2 ${tab === "credit" ? "is-on" : ""}`}
                  onClick={() => setTab("credit")}
                >
                  <Wallet size={14} /> Funds
                </button>
                <button
                  type="button"
                  className={`flex-1 inline-flex items-center justify-center gap-2 ${tab === "create" ? "is-on" : ""}`}
                  onClick={() => setTab("create")}
                >
                  <Briefcase size={14} /> New Account
                </button>
                <button
                  type="button"
                  className={`flex-1 inline-flex items-center justify-center gap-2 ${tab === "eval" ? "is-on" : ""}`}
                  onClick={() => {
                    setTab("eval");
                    const target =
                      ledger.accounts.find((a) => a.id === evalForm.account_id) ||
                      ledger.accounts[0];
                    if (target) syncEvalFormFromAccount(target);
                  }}
                >
                  <Target size={14} /> Eval &amp; Risk
                </button>
              </div>

              {tab === "credit" ? (
                <form onSubmit={submitFunds} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Target Account</Label>
                      <select
                        value={fundForm.account_id}
                        onChange={(e) => setFundForm({ ...fundForm, account_id: e.target.value })}
                        className="input-dark mt-2 text-xs font-mono"
                      >
                        {!ledger.accounts.length && (
                          <option value="">Auto-create Funded Wallet</option>
                        )}
                        {ledger.accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.account_number || a.id} · {a.plan_name} ({formatINR(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label>Adjustment Type</Label>
                      <div className="seg w-full mt-2">
                        <button
                          type="button"
                          className={`flex-1 ${fundForm.type === "credit" ? "is-buy" : ""}`}
                          onClick={() => setFundForm({ ...fundForm, type: "credit" })}
                        >
                          Credit (+)
                        </button>
                        <button
                          type="button"
                          className={`flex-1 ${fundForm.type === "debit" ? "is-sell" : ""}`}
                          onClick={() => setFundForm({ ...fundForm, type: "debit" })}
                        >
                          Debit (−)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Quick Presets</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[25000, 50000, 100000, 300000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setFundForm({ ...fundForm, amount: amt })}
                          className={`px-3 py-1.5 rounded-full text-xs font-mono border transition ${
                            Number(fundForm.amount) === amt
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border-hi)] text-[var(--muted)] hover:text-white"
                          }`}
                        >
                          +{formatINR(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Amount (₹)</Label>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={fundForm.amount}
                        onChange={(e) => setFundForm({ ...fundForm, amount: +e.target.value })}
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                        data-testid="admin-fund-amount"
                      />
                    </div>
                    <div>
                      <Label>Reason / Reference Note</Label>
                      <Input
                        value={fundForm.note}
                        onChange={(e) => setFundForm({ ...fundForm, note: e.target.value })}
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                        placeholder="e.g. Challenge bonus top-up"
                        data-testid="admin-fund-note"
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-amber rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                      data-testid="admin-fund-submit"
                    >
                      {saving
                        ? "Saving…"
                        : `${fundForm.type === "debit" ? "Debit" : "Credit"} ${formatINR(fundForm.amount || 0)}`}
                    </button>
                  </DialogFooter>
                </form>
              ) : tab === "create" ? (
                <form onSubmit={submitNewAccount} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <Label>Account Type</Label>
                      <div className="seg w-full mt-2">
                        {["Funded", "Challenge"].map((t) => (
                          <button
                            key={t}
                            type="button"
                            className={`flex-1 ${acctForm.account_type === t ? "is-on" : ""}`}
                            onClick={() =>
                              setAcctForm({
                                ...acctForm,
                                account_type: t,
                                plan_name: t === "Funded" ? "Funded Pro" : "Standard",
                              })
                            }
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Plan Name</Label>
                      <Input
                        value={acctForm.plan_name}
                        onChange={(e) => setAcctForm({ ...acctForm, plan_name: e.target.value })}
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                        placeholder="Starter / Standard / Pro / Elite"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Starting Capital Presets</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {[100000, 300000, 500000, 1000000].map((cap) => (
                        <button
                          key={cap}
                          type="button"
                          onClick={() => setAcctForm({ ...acctForm, starting_capital: cap })}
                          className={`px-3 py-1.5 rounded-full text-xs font-mono border transition ${
                            Number(acctForm.starting_capital) === cap
                              ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                              : "border-[var(--border-hi)] text-[var(--muted)] hover:text-white"
                          }`}
                        >
                          {formatINR(cap)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                      <Label>Initial Capital (₹)</Label>
                      <Input
                        type="number"
                        min="1000"
                        value={acctForm.starting_capital}
                        onChange={(e) =>
                          setAcctForm({ ...acctForm, starting_capital: +e.target.value })
                        }
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                        data-testid="admin-acct-capital"
                      />
                    </div>
                    <div>
                      <Label>Profit Split (%)</Label>
                      <Input
                        type="number"
                        min="50"
                        max="95"
                        value={acctForm.profit_split}
                        onChange={(e) =>
                          setAcctForm({ ...acctForm, profit_split: +e.target.value })
                        }
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                      />
                    </div>
                    <div>
                      <Label>Max Drawdown (%)</Label>
                      <Input
                        type="number"
                        min="5"
                        max="50"
                        value={acctForm.max_loss_limit}
                        onChange={(e) =>
                          setAcctForm({ ...acctForm, max_loss_limit: +e.target.value })
                        }
                        className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Provisioning Note</Label>
                    <Input
                      value={acctForm.note}
                      onChange={(e) => setAcctForm({ ...acctForm, note: e.target.value })}
                      className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                      placeholder="e.g. Direct funded allocation after KYC approval"
                    />
                  </div>

                  <DialogFooter>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-amber rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                      data-testid="admin-acct-submit"
                    >
                      {saving
                        ? "Provisioning…"
                        : `Provision ${acctForm.account_type} (${formatINR(acctForm.starting_capital || 0)})`}
                    </button>
                  </DialogFooter>
                </form>
              ) : null}

              {tab === "eval" && (
                <form onSubmit={submitEvalRisk} className="space-y-4">
                  {!ledger.accounts.length ? (
                    <div className="text-xs text-[var(--muted)] py-4">
                      This trader has no accounts yet. Provision an account or credit funds first.
                    </div>
                  ) : (
                    <>
                      <div className="grid sm:grid-cols-2 gap-3">
                        <div>
                          <Label>Select Account</Label>
                          <select
                            value={evalForm.account_id}
                            onChange={(e) => {
                              const found = ledger.accounts.find((a) => a.id === e.target.value);
                              if (found) syncEvalFormFromAccount(found);
                            }}
                            className="input-dark mt-2 text-xs font-mono"
                          >
                            {ledger.accounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.account_number || a.id} · {a.plan_name} ({a.status})
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label>Account Status</Label>
                          <select
                            value={evalForm.status}
                            onChange={(e) => setEvalForm({ ...evalForm, status: e.target.value })}
                            className="input-dark mt-2 text-xs font-mono"
                          >
                            {["Active", "Funded", "Passed", "Completed", "Failed"].map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        <div>
                          <Label>Profit Target (%)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={evalForm.profit_target_pct}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, profit_target_pct: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Max Drawdown (%)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={evalForm.max_loss_limit}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, max_loss_limit: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Daily Loss Limit (%)</Label>
                          <Input
                            type="number"
                            step="0.5"
                            value={evalForm.daily_loss_limit_pct}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, daily_loss_limit_pct: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Trades Per Day</Label>
                          <Input
                            type="number"
                            value={evalForm.trades_per_day}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, trades_per_day: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Min Trading Days</Label>
                          <Input
                            type="number"
                            value={evalForm.min_trading_days}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, min_trading_days: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Profit Split (%)</Label>
                          <Input
                            type="number"
                            value={evalForm.profit_split}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, profit_split: +e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Days Done (override)</Label>
                          <Input
                            type="number"
                            placeholder="Auto"
                            value={evalForm.trading_days_done}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, trading_days_done: e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                        <div>
                          <Label>Days Elapsed (override)</Label>
                          <Input
                            type="number"
                            placeholder="Auto"
                            value={evalForm.days_elapsed}
                            onChange={(e) =>
                              setEvalForm({ ...evalForm, days_elapsed: e.target.value })
                            }
                            className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2 font-mono"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <button
                          type="submit"
                          disabled={saving}
                          className="btn-amber rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                        >
                          {saving ? "Updating…" : "Save Evaluation & Risk Rules"}
                        </button>
                      </DialogFooter>
                    </>
                  )}
                </form>
              )}

              {/* Active Accounts & Ledger History */}
              <div className="pt-4 border-t border-[var(--border)] space-y-4">
                <div>
                  <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)] mb-2">
                    Trader Accounts ({ledger.accounts.length})
                  </div>
                  {ledger.accounts.length ? (
                    <div className="grid sm:grid-cols-2 gap-2.5">
                      {ledger.accounts.map((a) => (
                        <div
                          key={a.id}
                          className="rounded-xl border border-[var(--border)] bg-[var(--bg-1)] p-3 text-xs"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-mono text-[var(--muted-2)]">
                              {a.account_number || a.id}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[rgba(41,211,154,0.12)] text-[#29d39a]">
                              {a.status}
                            </span>
                          </div>
                          <div className="font-medium text-sm mt-1">
                            {a.plan_name} · {a.account_type}
                          </div>
                          <div className="flex justify-between mt-2 text-[var(--muted)]">
                            <span>Bal: {formatINR(a.balance)}</span>
                            <span>Cap: {formatINR(a.starting_capital)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--muted)]">
                      No accounts yet. Crediting funds will auto-create a Funded Wallet.
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs uppercase tracking-wider font-mono text-[var(--muted-2)] mb-2">
                    Fund Ledger History ({ledger.transactions.length})
                  </div>
                  {ledgerLoading ? (
                    <div className="text-xs text-[var(--muted)]">Loading ledger…</div>
                  ) : ledger.transactions.length ? (
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--bg-1)]">
                      {ledger.transactions.map((tx) => {
                        const isDebit = tx.kind === "debit";
                        return (
                          <div
                            key={tx.id}
                            className="p-2.5 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-medium truncate">{tx.note}</div>
                              <div className="text-[10px] font-mono text-[var(--muted-2)]">
                                {tx.account_number} · {new Date(tx.created_at).toLocaleString()}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div
                                className={
                                  isDebit
                                    ? "text-[var(--rose)] font-mono"
                                    : "text-[var(--emerald)] font-mono"
                                }
                              >
                                {isDebit ? "−" : "+"}
                                {formatINR(tx.amount)}
                              </div>
                              <div className="text-[10px] text-[var(--muted-2)] font-mono">
                                Bal {formatINR(tx.balance_after)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--muted)]">
                      No fund adjustments recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Admin Weekly Highest Payouts (curated) =====
const emptyWP = {
  image_url: "",
  trader_name: "",
  amount: 0,
  plan: "",
  account_size: 0,
  payout_date: "",
  order: 0,
  visible: true,
};

export function AdminWeeklyPayouts() {
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const load = () => api.get("/admin/weekly-payouts").then((r) => setRows(r.data || []));
  useEffect(() => {
    load();
  }, []);
  const save = async () => {
    try {
      if (!editing.image_url) {
        toast.error("Please upload or paste an image URL");
        return;
      }
      if (editing.id) await api.put(`/admin/weekly-payouts/${editing.id}`, editing);
      else await api.post("/admin/weekly-payouts", editing);
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail));
    }
  };
  const del = async (id) => {
    if (!window.confirm("Delete this weekly payout entry?")) return;
    await api.delete(`/admin/weekly-payouts/${id}`);
    toast.success("Deleted");
    load();
  };
  const onFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5MB)");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setEditing((prev) => ({ ...prev, image_url: reader.result }));
      setUploading(false);
      toast.success("Image loaded");
    };
    reader.onerror = () => {
      setUploading(false);
      toast.error("Failed to read file");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div>
          <div className="chip mb-3">
            <Trophy size={12} /> Weekly Highest Payout
          </div>
          <h1 className="font-display text-4xl">Weekly Highest Payouts</h1>
          <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">
            Curated winners shown on the home page — one card per plan (Starter / Standard / Pro).
            Entries listed here override the auto-derived list from certificates.
          </p>
        </div>
        <button
          onClick={() => setEditing({ ...emptyWP })}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="wp-new-btn"
        >
          <Plus size={16} /> New Weekly Payout
        </button>
      </div>
      <div className="card-panel overflow-hidden mt-6">
        <Table>
          <TableHeader>
            <TableRow className="border-[var(--border)]">
              <TableHead>Image</TableHead>
              <TableHead>Trader</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Visible</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow
                key={c.id}
                className="border-[var(--border)]"
                data-testid={`wp-row-${c.id}`}
              >
                <TableCell>
                  <img
                    src={c.image_url}
                    alt=""
                    className="w-16 h-16 object-cover rounded-md border border-[var(--border)]"
                  />
                </TableCell>
                <TableCell className="font-display">{c.trader_name || "—"}</TableCell>
                <TableCell>{c.plan || "—"}</TableCell>
                <TableCell className="text-[var(--accent)] font-mono">
                  {c.amount ? formatINR(c.amount) : "—"}
                </TableCell>
                <TableCell className="text-xs text-[var(--muted)]">
                  {c.payout_date || "—"}
                </TableCell>
                <TableCell className="font-mono">{c.order}</TableCell>
                <TableCell>{c.visible ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <button
                    onClick={() => setEditing(c)}
                    className="btn-ghost px-3 py-1.5 rounded-md mr-2"
                    data-testid={`wp-edit-${c.id}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => del(c.id)}
                    className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
                    data-testid={`wp-delete-${c.id}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow className="border-[var(--border)]">
                <TableCell colSpan={8} className="text-center text-[var(--muted)] py-8">
                  No curated weekly payouts yet — the home page currently auto-picks winners from
                  Certificates. Add entries here to override.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] text-white max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing?.id ? "Edit Weekly Payout" : "New Weekly Payout"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Award / Certificate Image</Label>
                <div className="mt-2 flex items-center gap-3">
                  <label
                    className="btn-amber rounded-full px-4 py-2 text-sm inline-flex items-center gap-2 cursor-pointer"
                    data-testid="wp-upload-btn"
                  >
                    <Upload size={14} /> {uploading ? "Loading…" : "Upload from device"}
                    <input type="file" accept="image/*" onChange={onFile} className="hidden" />
                  </label>
                  {editing.image_url && (
                    <button
                      type="button"
                      onClick={() => setEditing({ ...editing, image_url: "" })}
                      className="btn-ghost rounded-full px-3 py-2 text-xs text-[var(--rose)]"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-[var(--muted-2)]">…or paste an image URL</Label>
                  <Input
                    value={editing.image_url?.startsWith("data:") ? "" : editing.image_url}
                    onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                    placeholder="https://…"
                  />
                </div>
              </div>
              {editing.image_url && (
                <img
                  src={editing.image_url}
                  alt=""
                  className="w-full max-h-64 object-contain rounded-md border border-[var(--border)]"
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Trader Name</Label>
                  <Input
                    value={editing.trader_name}
                    onChange={(e) => setEditing({ ...editing, trader_name: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Plan (Starter/Standard/Pro)</Label>
                  <Input
                    value={editing.plan}
                    onChange={(e) => setEditing({ ...editing, plan: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Payout Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.amount}
                    onChange={(e) => setEditing({ ...editing, amount: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Account Size (₹)</Label>
                  <Input
                    type="number"
                    value={editing.account_size}
                    onChange={(e) => setEditing({ ...editing, account_size: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Payout Date (DD/MM/YYYY)</Label>
                  <Input
                    value={editing.payout_date}
                    onChange={(e) => setEditing({ ...editing, payout_date: e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
                <div>
                  <Label>Order (lower = first)</Label>
                  <Input
                    type="number"
                    value={editing.order}
                    onChange={(e) => setEditing({ ...editing, order: +e.target.value })}
                    className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-2"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editing.visible}
                  onChange={(e) => setEditing({ ...editing, visible: e.target.checked })}
                />{" "}
                Visible on home page
              </label>
            </div>
          )}
          <DialogFooter>
            <button
              onClick={save}
              className="btn-amber rounded-full px-6 py-2.5 text-sm"
              data-testid="wp-save-btn"
            >
              Save
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminStories() {
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    city: "",
    title: "",
    payout_amount: "",
    rating: 5,
    video_url: "",
    story: "",
    status: "approved",
  });

  const load = () => api.get("/admin/stories").then((r) => setRows(r.data || []));
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    await api.put(`/admin/stories/${id}`, { status });
    toast.success(`Marked ${status}`);
    load();
  };

  const del = async (id) => {
    if (!window.confirm("Delete story?")) return;
    await api.delete(`/admin/stories/${id}`);
    toast.success("Story deleted");
    load();
  };

  const createStory = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim() || form.story.trim().length < 10) {
      return toast.error("Enter trader name, headline, and story (at least 10 characters).");
    }
    setSaving(true);
    try {
      await api.post("/admin/stories", {
        ...form,
        rating: Number(form.rating) || 5,
      });
      toast.success("Trader story posted");
      setOpen(false);
      setForm({
        name: "",
        city: "",
        title: "",
        payout_amount: "",
        rating: 5,
        video_url: "",
        story: "",
        status: "approved",
      });
      load();
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not post story"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="chip mb-3">Community</div>
          <h1 className="font-display text-4xl">Trader Stories ({rows.length})</h1>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          data-testid="admin-post-story-btn"
        >
          <Plus size={15} /> Post Story
        </button>
      </div>

      <div className="space-y-4 mt-10">
        {rows.length === 0 && (
          <div className="card-panel p-6 text-[var(--muted)]">No stories submitted yet.</div>
        )}
        {rows.map((s) => (
          <div key={s.id} className="card-panel p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <div className="font-display text-lg">{s.title}</div>
                <div className="text-xs text-[var(--muted)]">
                  {s.name}
                  {s.city ? ` · ${s.city}` : ""}
                  {s.payout_amount ? ` · ${s.payout_amount}` : ""}
                  {s.email ? ` · ${s.email}` : ""} · {s.rating || 5}★ ·{" "}
                  {s.created_at ? new Date(s.created_at).toLocaleDateString() : ""}
                </div>
              </div>
              <span className="chip">{s.status}</span>
            </div>
            <p className="text-sm text-[var(--muted)] mt-3 whitespace-pre-line">{s.story}</p>
            {s.video_url && (
              <a
                href={s.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--accent-hi)] mt-2 inline-block"
              >
                Video link
              </a>
            )}
            <div className="flex gap-2 mt-4">
              {s.status !== "approved" && (
                <button
                  onClick={() => setStatus(s.id, "approved")}
                  className="btn-amber px-4 py-1.5 rounded-md text-sm"
                >
                  Approve
                </button>
              )}
              {s.status !== "rejected" && (
                <button
                  onClick={() => setStatus(s.id, "rejected")}
                  className="btn-ghost px-4 py-1.5 rounded-md text-sm"
                >
                  Reject
                </button>
              )}
              <button
                onClick={() => del(s.id)}
                className="btn-ghost px-3 py-1.5 rounded-md text-[var(--rose)]"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] max-w-lg text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Post Trader Story</DialogTitle>
          </DialogHeader>
          <form onSubmit={createStory} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Trader Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                  placeholder="Rohan Verma"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                  placeholder="Surat"
                />
              </div>
            </div>
            <div>
              <Label>Story Headline *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                placeholder="Cleared ₹10L Standard challenge in 14 days"
              />
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Payout Amount</Label>
                <Input
                  value={form.payout_amount}
                  onChange={(e) => setForm({ ...form, payout_amount: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                  placeholder="₹84,000"
                />
              </div>
              <div>
                <Label>Rating (1–5)</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={form.rating}
                  onChange={(e) => setForm({ ...form, rating: e.target.value })}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                />
              </div>
              <div>
                <Label>Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="input-dark mt-1.5 text-xs"
                >
                  <option value="approved">Approved (Live)</option>
                  <option value="pending">Pending Review</option>
                </select>
              </div>
            </div>
            <div>
              <Label>Video Link (optional)</Label>
              <Input
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                placeholder="https://youtube.com/..."
              />
            </div>
            <div>
              <Label>Trader Story *</Label>
              <Textarea
                rows={4}
                value={form.story}
                onChange={(e) => setForm({ ...form, story: e.target.value })}
                className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                placeholder="Write the trader's journey, strategy, and payout experience..."
              />
            </div>
            <DialogFooter>
              <button
                type="submit"
                disabled={saving}
                className="btn-amber rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                data-testid="admin-post-story-submit"
              >
                {saving ? "Posting…" : "Publish Story"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminTickets() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [editStatus, setEditStatus] = useState("Pending");
  const [editNote, setEditNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    api
      .get("/admin/tickets")
      .then((r) => {
        setRows(Array.isArray(r.data) ? r.data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const openTicket = (tk) => {
    setSelected(tk);
    setEditStatus(tk.status || "Pending");
    setEditNote(tk.admin_note || "");
  };

  const saveTicket = async (e) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await api.patch(`/admin/tickets/${selected.id}`, {
        status: editStatus,
        admin_note: editNote,
      });
      setRows((prev) => prev.map((x) => (x.id === data.id ? data : x)));
      setSelected(null);
      toast.success(`Ticket ${data.id} updated`);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not update ticket"));
    } finally {
      setSaving(false);
    }
  };

  const deleteTicket = async (id) => {
    if (!window.confirm(`Delete support ticket ${id}?`)) return;
    await api.delete(`/admin/tickets/${id}`);
    toast.success("Ticket deleted");
    if (selected?.id === id) setSelected(null);
    load();
  };

  const filtered = rows.filter((t) => {
    if (statusFilter !== "All" && (t.status || "Pending") !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        String(t.id || "")
          .toLowerCase()
          .includes(q) ||
        String(t.user_name || "")
          .toLowerCase()
          .includes(q) ||
        String(t.user_email || "")
          .toLowerCase()
          .includes(q) ||
        String(t.user_phone || "")
          .toLowerCase()
          .includes(q) ||
        String(t.subject || "")
          .toLowerCase()
          .includes(q) ||
        String(t.message || "")
          .toLowerCase()
          .includes(q)
      );
    }
    return true;
  });

  const counts = {
    All: rows.length,
    Pending: rows.filter((r) => (r.status || "Pending") === "Pending").length,
    "In Review": rows.filter((r) => r.status === "In Review").length,
    Resolved: rows.filter((r) => r.status === "Resolved").length,
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="chip mb-3">
            <MessageSquare size={12} /> Client Support Desk
          </div>
          <h1 className="font-display text-4xl">Support Tickets ({rows.length})</h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            All client tickets generated from the Contact page and Trader Dashboard appear here with
            full client details.
          </p>
        </div>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search ticket ID, name, email, phone…"
          className="bg-[var(--bg-1)] border-[var(--border-hi)] w-full sm:w-72"
          data-testid="admin-tickets-search"
        />
      </div>

      <div className="flex flex-wrap gap-2 mt-6">
        {["All", "Pending", "In Review", "Resolved", "Closed"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-4 py-1.5 rounded-full text-xs font-mono border transition ${
              statusFilter === st
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border-hi)] text-[var(--muted)] hover:text-white"
            }`}
          >
            {st}
            {counts[st] != null ? ` (${counts[st]})` : ""}
          </button>
        ))}
      </div>

      <div className="space-y-4 mt-6">
        {loading ? (
          <div className="card-panel p-8 text-center text-[var(--muted)]">Loading tickets…</div>
        ) : filtered.length === 0 ? (
          <div className="card-panel p-8 text-center text-[var(--muted)]">
            No support tickets matching this filter.
          </div>
        ) : (
          filtered.map((t) => (
            <div key={t.id} className="card-panel p-5" data-testid={`admin-ticket-card-${t.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--accent-hi)] border border-[var(--border)]">
                      {t.id}
                    </span>
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[var(--muted-2)]">
                      {t.category || "Support"}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--muted)]">
                      {t.source === "contact-page" ? "Contact Page" : "Trader Dashboard"}
                    </span>
                  </div>
                  <h2 className="font-display text-xl text-white mt-2">{t.subject}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`status-pill ${
                      t.status === "Resolved"
                        ? "is-ok"
                        : t.status === "Closed"
                          ? "neutral"
                          : "is-wait"
                    }`}
                  >
                    {t.status || "Pending"}
                  </span>
                  <button
                    type="button"
                    onClick={() => openTicket(t)}
                    className="btn-ghost rounded-full px-3.5 py-1.5 text-xs inline-flex items-center gap-1"
                    data-testid={`admin-ticket-manage-${t.id}`}
                  >
                    <Pencil size={12} /> Manage
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTicket(t.id)}
                    className="btn-ghost rounded-full px-2.5 py-1.5 text-xs text-[var(--rose)]"
                    aria-label="Delete ticket"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-4 gap-3 mt-4 p-3 rounded-xl bg-[var(--bg-1)] border border-[var(--border)] text-xs">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted-2)] block">
                    Client Name
                  </span>
                  <strong className="text-white font-medium mt-0.5 block">
                    {t.user_name || "Guest"}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted-2)] block">
                    Email
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--muted)] mt-0.5 break-all">
                    <Mail size={11} className="text-[var(--accent)] shrink-0" />
                    {t.user_email || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted-2)] block">
                    Phone
                  </span>
                  <span className="inline-flex items-center gap-1 text-[var(--muted)] mt-0.5 font-mono">
                    <Phone size={11} className="text-[var(--accent)] shrink-0" />
                    {t.user_phone || "—"}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-mono text-[var(--muted-2)] block">
                    Submitted
                  </span>
                  <span className="text-[var(--muted)] mt-0.5 font-mono block">
                    {t.date ||
                      (t.created_at ? String(t.created_at).slice(0, 16).replace("T", " ") : "—")}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[var(--text)] mt-4 whitespace-pre-line leading-relaxed">
                {t.message}
              </p>

              {t.admin_note && (
                <div className="mt-3 p-3 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 text-xs text-[var(--muted)]">
                  <strong className="text-[var(--emerald)] font-mono uppercase tracking-wider text-[10px] block mb-1">
                    Admin Resolution Note
                  </strong>
                  {t.admin_note}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="bg-[var(--bg-2)] border-[var(--border)] max-w-md text-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              Manage Ticket {selected?.id}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <form onSubmit={saveTicket} className="space-y-4">
              <div className="text-xs text-[var(--muted)] space-y-1 p-3 rounded-xl bg-[var(--bg-1)] border border-[var(--border)]">
                <div>
                  <strong className="text-white">{selected.user_name || "Guest"}</strong> ·{" "}
                  {selected.user_email || "—"}
                </div>
                {selected.user_phone && (
                  <div className="font-mono">Phone: {selected.user_phone}</div>
                )}
                <div className="text-[var(--text)] pt-1">{selected.subject}</div>
              </div>
              <div>
                <Label>Ticket Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="input-dark mt-1.5 text-sm"
                >
                  {["Pending", "In Review", "Resolved", "Closed"].map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Admin Note / Reply Summary</Label>
                <Textarea
                  rows={4}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="bg-[var(--bg-1)] border-[var(--border-hi)] mt-1.5"
                  placeholder="Write internal resolution note or update visible to client…"
                />
              </div>
              <DialogFooter>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-amber rounded-full px-6 py-2.5 text-sm disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Update"}
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
