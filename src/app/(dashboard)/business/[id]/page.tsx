"use client";

import {
  deleteBusiness,
  getBusinesses,
  getUserFeatures,
} from "@/actions/business";
import {
  addCustomerBatch,
  deleteCustomer,
  deleteSelectedCustomers,
  getCustomers,
} from "@/actions/customers";
import {
  addPointToCustomer,
  setCustomerPoints,
  subtractPointFromCustomer,
} from "@/actions/points";
import { redeemDiscountCodeInDashboard } from "@/actions/redeem";
import { sendBatchInvitations, sendInvitation } from "@/actions/send";
import BackButton from "@/components/back-button";
import BusinessQR from "@/components/business-qr";
import GoogleReviewsSection from "@/components/google-reviews-section";
import SocialInbox from "@/components/social-inbox";
import SocialConnectionsSection from "@/components/social-connections-section";
import Button from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useRef, useState } from "react";

type Business = Awaited<ReturnType<typeof getBusinesses>>[number];
type Customer = Awaited<ReturnType<typeof getCustomers>>[number];

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  invited: "Invitado",
  completed: "Completado",
};

const statusColor: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  invited: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
};

const CustomerDetail = ({
  customer,
  onClose,
}: {
  customer: Customer;
  onClose: () => void;
}) => (
  <>
    <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {customer.name ?? "Cliente"}
          </h2>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
          >
            &times;
          </button>
        </div>
        <dl className="flex flex-col gap-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Email</dt>
            <dd>{customer.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Teléfono</dt>
            <dd>{customer.phone}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Registrado</dt>
            <dd>{new Date(customer.createdAt).toLocaleDateString("es-ES")}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Estado</dt>
            <dd>
              <span
                className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColor[customer.status]}`}
              >
                {statusLabel[customer.status]}
              </span>
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Puntos</dt>
            <dd className="font-medium">{customer.points}</dd>
          </div>
          {(customer as any).invitedCount != null && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Invitaciones enviadas</dt>
              <dd>{(customer as any).invitedCount ?? 0}</dd>
            </div>
          )}
          {(customer as any).lastInvitedAt && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Último envío</dt>
              <dd>
                {new Date((customer as any).lastInvitedAt).toLocaleDateString(
                  "es-ES",
                )}
              </dd>
            </div>
          )}
          {(customer as any).rating && (
            <div className="flex justify-between">
              <dt className="text-neutral-500">Valoración</dt>
              <dd className="flex items-center gap-1">
                <span
                  style={{
                    color: (customer as any).rating < 4 ? "#ef4444" : "#f59e0b",
                  }}
                >
                  {"★".repeat((customer as any).rating)}
                </span>
                <span className="text-neutral-400">
                  {"☆".repeat(5 - (customer as any).rating)}
                </span>
              </dd>
            </div>
          )}
          {(customer as any).feedback && (
            <div className="flex flex-col gap-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 mt-2">
              <dt className="text-neutral-500 text-xs">Feedback</dt>
              <dd className="text-sm text-neutral-950 dark:text-neutral-100 leading-relaxed">
                {(customer as any).feedback}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  </>
);

const ActionMenu = ({
  customer,
  isOpen,
  onToggle,
  onClose,
  onAddPoint,
  onSubtractPoint,
  onSendEmail,
  onWhatsApp,
  onDelete,
  onDetail,
}: {
  customer: Customer;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddPoint: (id: string) => void;
  onSubtractPoint: (id: string) => void;
  onSendEmail: (id: string) => void;
  onWhatsApp: (phone: string) => void;
  onDelete: (id: string) => void;
  onDetail: (customer: Customer) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="text-[10px] sm:text-[11px] font-medium px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
        aria-label="Acciones"
      >
        ⋮
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={onClose} />
          <div className="absolute right-0 z-20 mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1">
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(customer); onClose(); }}
              className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              Ver detalle
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAddPoint(customer.id); onClose(); }}
              className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              +1 punto
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onSubtractPoint(customer.id); onClose(); }}
              disabled={customer.points === 0}
              className="block w-full text-left px-4 py-2 text-xs text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-40 cursor-not-allowed"
            >
              -1 punto
            </button>
            {customer.status !== "completed" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onSendEmail(customer.id); onClose(); }}
                  className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Enviar email
                </button>
                {customer.phone && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onWhatsApp(customer.phone); onClose(); }}
                    className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    Enviar WhatsApp
                  </button>
                )}
              </>
            )}
            {customer.status === "completed" && (
              <div className="px-4 py-2 text-[11px] text-emerald-600">
                ✅ Reseña completada
              </div>
            )}
            <hr className="my-1 border-neutral-200 dark:border-neutral-700" />
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(customer.id); onClose(); }}
              className="block w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            >
              Eliminar
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const CustomersPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params);
  const [business, setBusiness] = useState<Business | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filter, setFilter] = useState("all");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchSending, setBatchSending] = useState(false);
  const [detail, setDetail] = useState<Customer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCsv, setShowCsv] = useState(false);
  const [addForm, setAddForm] = useState({ name: "", email: "", phone: "" });
  const [csvResult, setCsvResult] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [addingPointId, setAddingPointId] = useState<string | null>(null);
  const [editPoints, setEditPoints] = useState<Customer | null>(null);
  const [pointsInput, setPointsInput] = useState("");
  const [savingPoints, setSavingPoints] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState("");
  const [redeemResult, setRedeemResult] = useState<{
    customerName: string;
    newCode: string;
    remainingPoints: number;
  } | null>(null);
  const [dropdownId, setDropdownId] = useState<string | null>(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    const businesses = await getBusinesses();
    const found = businesses.find((b) => b.id === id);
    setBusiness(found ?? null);
    if (found) setCustomers(await getCustomers(id));
    const userFeatures = await getUserFeatures();
    setFeatures(userFeatures);
  }, [id]);

  useEffect(() => {
    load();
  }, [id, load]);

  const handleAddPoint = async (customerId: string) => {
    setAddingPointId(customerId);
    const result = await addPointToCustomer(customerId);
    if (result.success) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, points: result.points } : c,
        ),
      );
    } else {
      alert(result.error);
    }
    setAddingPointId(null);
    setDropdownId(null);
  };

  const handleSubtractPoint = async (customerId: string) => {
    setAddingPointId(customerId);
    const result = await subtractPointFromCustomer(customerId);
    if (result.success) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, points: result.points } : c,
        ),
      );
    } else {
      alert(result.error);
    }
    setAddingPointId(null);
    setDropdownId(null);
  };

  const handleSetPoints = async () => {
    if (!editPoints) return;
    setSavingPoints(true);
    const result = await setCustomerPoints(
      editPoints.id,
      parseInt(pointsInput, 10),
    );
    if (result.success) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editPoints.id ? { ...c, points: result.points } : c,
        ),
      );
      setEditPoints(null);
    } else {
      alert(result.error);
    }
    setSavingPoints(false);
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setRedeeming(true);
    setRedeemError("");
    setRedeemResult(null);
    const result = await redeemDiscountCodeInDashboard(id, redeemCode);
    if (!result.success) {
      setRedeemError(result.error);
    } else {
      setRedeemResult(result);
      setRedeemCode("");
      await load();
    }
    setRedeeming(false);
  };

  const handleSend = async (customerId: string) => {
    setSendingId(customerId);
    try {
      await sendInvitation(customerId);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, status: "invited" } : c,
        ),
      );
    } catch (e) {
      alert(
        "Error al enviar: " + (e instanceof Error ? e.message : "desconocido"),
      );
    }
    setSendingId(null);
    setDropdownId(null);
  };

  const toggleSelect = (customerId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  };

  const handleBatchSend = async () => {
    setBatchSending(true);
    const ids = Array.from(selected);
    const { sent, failed } = await sendBatchInvitations(ids);
    await load();
    setSelected(new Set());
    setBatchSending(false);
    if (failed > 0) {
      alert(
        `Enviados: ${sent} | Fallos: ${failed}. Revisa la consola para más detalles.`,
      );
    }
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await deleteCustomer(customerId);
      setCustomers((prev) => prev.filter((c) => c.id !== customerId));
    } catch (e) {
      alert(
        "Error al eliminar: " +
          (e instanceof Error ? e.message : "desconocido"),
      );
    }
    setDropdownId(null);
  };

  const handleClearCompleted = () => {
    setFilter("pending");
  };

  const handleDeleteSelected = async () => {
    const ids = Array.from(selected);
    if (
      !confirm(
        `¿Eliminar ${ids.length} cliente${ids.length !== 1 ? "s" : ""} seleccionado${ids.length !== 1 ? "s" : ""}?`,
      )
    )
      return;
    try {
      await deleteSelectedCustomers(ids);
      setCustomers((prev) => prev.filter((c) => !selected.has(c.id)));
      setSelected(new Set());
    } catch (e) {
      alert(
        "Error al eliminar: " +
          (e instanceof Error ? e.message : "desconocido"),
      );
    }
  };

  const handleDeleteBusiness = async () => {
    if (
      !window.confirm(
        "¿Eliminar este negocio? Todos sus clientes se borrarán permanentemente.",
      )
    )
      return;
    setDeleting(true);
    try {
      await deleteBusiness(id);
      router.push("/business");
    } catch (err: any) {
      alert(err.message);
      setDeleting(false);
    }
  };

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCustomerBatch(id, [{ ...addForm }]);
      setAddForm({ name: "", email: "", phone: "" });
      setShowAdd(false);
      await load();
    } catch (err) {
      alert(
        "Error al añadir cliente: " +
          (err instanceof Error ? err.message : "desconocido"),
      );
    }
  };

  const handleCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      setCsvResult("El CSV debe tener al menos 2 líneas (cabecera + datos)");
      return;
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx =
      headers.indexOf("nombre") !== -1
        ? headers.indexOf("nombre")
        : headers.indexOf("name");
    const emailIdx =
      headers.indexOf("email") !== -1
        ? headers.indexOf("email")
        : headers.indexOf("correo") !== -1
          ? headers.indexOf("correo")
          : headers.indexOf("mail");
    const phoneIdx =
      headers.indexOf("telefono") !== -1
        ? headers.indexOf("telefono")
        : headers.indexOf("phone") !== -1
          ? headers.indexOf("phone")
          : headers.indexOf("teléfono") !== -1
            ? headers.indexOf("teléfono")
            : headers.indexOf("tlf");

    if (emailIdx === -1) {
      setCsvResult('El CSV debe tener una columna "email"');
      return;
    }
    if (phoneIdx === -1) {
      setCsvResult('El CSV debe tener una columna "teléfono" o "phone"');
      return;
    }

    const customerRows = lines
      .slice(1)
      .map((line) => {
        const cols = line.split(",").map((c) => c.trim());
        return {
          name: nameIdx >= 0 ? cols[nameIdx] : "",
          email: cols[emailIdx],
          phone: cols[phoneIdx],
        };
      })
      .filter((c) => c.email);

    const result = await addCustomerBatch(id, customerRows);
    setCsvResult(
      `Importados ${result.created} cliente(s). ${result.errors} error(es).`,
    );
    e.target.value = "";
    await load();
  };

  const filtered =
    filter === "all" ? customers : customers.filter((c) => c.status === filter);

  const total = customers.length;
  const invited = customers.filter((c) => c.status === "invited").length;
  const completed = customers.filter((c) => c.status === "completed").length;
  const canDeleteSelected = selected.size > 0;
  const canBatchSend = selected.size > 0 && !batchSending;

  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMoreMenu]);

  return (
    <div className="flex flex-col gap-8">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="mb-3">
            <BackButton label="Volver a negocios" />
          </div>
          <div className="flex items-center gap-3">
            {business?.image && (
              <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={business.image}
                  alt={business.name}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                />
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">
                {business?.name ?? "Cargando..."}
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <p className="text-sm text-neutral-500">
                  {total} cliente{total !== 1 ? "s" : ""} registrado
                  {total !== 1 ? "s" : ""}
                </p>
                {business?.slug && (
                  <>
                    <span className="text-neutral-300">·</span>
                    <a
                      href={`/${business.slug}`}
                      target="_blank"
                      className="text-[10px] sm:text-xs font-medium px-2.5 py-1 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                    >
                      Enlace fidelización
                    </a>
                    <BusinessQR slug={business.slug} />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fidelización */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-neutral-950 dark:bg-neutral-100 px-6 py-2.5">
          <h2 className="text-xs font-semibold text-white dark:text-neutral-950 uppercase tracking-wider">
            Fidelización
          </h2>
        </div>
        <div className="flex flex-col">

          {/* Canjear */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-semibold mb-1">Canjear descuento en caja</h3>
            <p className="text-xs text-neutral-400 mb-4">
              Pide al cliente su código (formato <strong>REVLY-XXXX</strong>),
              escríbelo aquí y pulsa <strong>Canjear</strong>. Se descontarán 5 puntos y se generará un código nuevo.
            </p>
            <form onSubmit={handleRedeem} className="flex flex-col sm:flex-row gap-2 max-w-md">
              <input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder="REVLY-XXXX"
                required
                aria-label="Código de descuento del cliente"
                className="w-full sm:w-64 px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400 font-mono tracking-wider uppercase"
              />
              <Button type="submit" variant="primary" disabled={redeeming}>
                {redeeming ? "Canjeando..." : "Canjear"}
              </Button>
            </form>
            {redeemError && (
              <p className="text-sm text-red-500 mt-3">{redeemError}</p>
            )}
            {redeemResult && (
              <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  ✅ Descuento canjeado a {redeemResult.customerName}
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2">
                  1. Aplica el <strong>10% de descuento</strong> en el TPV.
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  2. Le quedan <strong>{redeemResult.remainingPoints}</strong> punto(s).
                </p>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  3. Su nuevo código: <strong className="font-mono">{redeemResult.newCode}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Resumen */}
          <div className="p-6 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-sm font-semibold mb-1">Resumen</h3>
            <div className="grid grid-cols-3 gap-4">
              <Card neumorphic className="p-5 text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Registrados</p>
              </Card>
              <Card neumorphic className="p-5 text-center">
                <p className="text-2xl font-bold">{invited}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Invitados</p>
              </Card>
              <Card neumorphic className="p-5 text-center">
                <p className="text-2xl font-bold">{completed}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">Completados</p>
              </Card>
            </div>
          </div>

          {/* Clientes */}
          <div className="p-6 pt-4 flex flex-col gap-4">
            <h3 className="text-sm font-semibold mb-1">Clientes</h3>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Clientes
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Gestiona tu base de clientes
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {["all", "pending", "invited", "completed"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                  filter === f
                    ? "border-neutral-950 dark:border-neutral-100 bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950"
                    : "border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-neutral-950 dark:hover:border-neutral-100"
                }`}
              >
                {f === "all" ? "Todos" : statusLabel[f]}
              </button>
            ))}
            <div className="relative" ref={moreMenuRef}>
              <Button
                variant="secondary"
                className="!px-2.5 !py-1 text-[10px] sm:!px-3 sm:!py-1.5 sm:text-[11px]"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
              >
                ▾ Más
              </Button>
              {showMoreMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMoreMenu(false)} />
                  <div className="absolute right-0 z-20 mt-1 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg shadow-lg py-1">
                    <button
                      onClick={() => { setShowAdd(true); setShowMoreMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      + Añadir cliente
                    </button>
                    <button
                      onClick={() => { setShowCsv(true); setShowMoreMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Importar CSV
                    </button>
                    <button
                      onClick={() => { setShowMoreMenu(false); }}
                      className="block w-full text-left px-4 py-2 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                      <Link href={`/business/${id}/settings`}>Configuración</Link>
                    </button>
                    {canDeleteSelected && (
                      <button
                        onClick={() => { handleDeleteSelected(); setShowMoreMenu(false); }}
                        className="block w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      >
                        Eliminar seleccionados ({selected.size})
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Batch actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/10 rounded-lg px-4 py-2">
            <span className="text-xs text-blue-700 dark:text-blue-300">
              {selected.size} seleccionado{selected.size !== 1 ? "s" : ""}
            </span>
            <Button
              variant="primary"
              className="!px-3 !py-1 text-[10px] sm:!px-4 sm:!py-1.5 sm:text-[11px]"
              onClick={handleBatchSend}
              disabled={!canBatchSend}
            >
              {batchSending ? "..." : "Enviar email"}
            </Button>
            <button
              onClick={handleDeleteSelected}
              className="text-xs text-red-500 hover:text-red-700 transition-colors"
            >
              Eliminar
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Tabla */}
        {filtered.length === 0 ? (
          <Card neumorphic className="p-6">
            <div className="flex flex-col items-center gap-3 py-8">
              <svg
                className="w-10 h-10 text-neutral-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 15c0 0 1.5-2 4-2s4 2 4 2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
              <p className="text-sm text-neutral-400 text-center">
                {customers.length === 0
                  ? "Comparte el código QR del negocio para empezar."
                  : "No hay clientes con este estado."}
              </p>
            </div>
          </Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800">
                  <th className="pb-3 pr-2 w-8">
                    <input
                      type="checkbox"
                      onChange={toggleAll}
                      checked={selected.size === filtered.length && filtered.length > 0}
                      className="w-4 h-4 accent-neutral-950"
                    />
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Cliente
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden sm:table-cell">
                    Teléfono
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap hidden md:table-cell">
                    Email
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Estado
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 pr-4 whitespace-nowrap">
                    Puntos
                  </th>
                  <th className="text-left font-medium text-neutral-500 pb-3 whitespace-nowrap pl-2">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-neutral-100 dark:border-neutral-800 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition-colors"
                  >
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="w-4 h-4 accent-neutral-950"
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{c.name ?? "—"}</span>
                    </td>
                    <td className="py-3 pr-4 text-neutral-500 hidden sm:table-cell">
                      {c.phone}
                    </td>
                    <td className="py-3 pr-4 text-neutral-500 hidden md:table-cell">
                      {c.email}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          c.status === "completed" && c.rating != null && c.rating < 4
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : statusColor[c.status] ?? "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {statusLabel[c.status] ?? c.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="font-medium">{c.points}</span>
                    </td>
                    <td className="py-3 pl-2">
                      <ActionMenu
                        customer={c}
                        isOpen={dropdownId === c.id}
                        onToggle={() =>
                          setDropdownId(dropdownId === c.id ? null : c.id)
                        }
                        onClose={() => setDropdownId(null)}
                        onAddPoint={handleAddPoint}
                        onSubtractPoint={handleSubtractPoint}
                        onSendEmail={handleSend}
                        onWhatsApp={(phone) => {
                          const cleanPhone = phone.replace(/[\s\-()\+]/g, "");
                          window.open(
                            `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hola ${c.name ?? ""}, ¿cómo valorarías tu experiencia en ${business?.name ?? ""}?`)}`,
                            "_blank",
                          );
                          setDropdownId(null);
                        }}
                        onDelete={handleDelete}
                        onDetail={setDetail}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
        </div>
      </section>

      {detail && (
        <CustomerDetail customer={detail} onClose={() => setDetail(null)} />
      )}

      {/* Modal: Añadir cliente */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowAdd(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-4">Añadir cliente</h2>
              <form onSubmit={handleAddManual} className="flex flex-col gap-4">
                <input
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="Nombre"
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                />
                <input
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="Email"
                  required
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                />
                <input
                  value={addForm.phone}
                  onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                  placeholder="Teléfono"
                  required
                  className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" type="button" onClick={() => setShowAdd(false)}>
                    Cancelar
                  </Button>
                  <Button variant="primary" type="submit">Guardar</Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Modal: CSV */}
      {showCsv && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setShowCsv(false); setCsvResult(""); }} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-1">Importar CSV</h2>
              <p className="text-xs text-neutral-400 mb-4">
                Columnas: nombre, email, teléfono (separado por comas)
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleCsv}
                className="text-sm text-neutral-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-neutral-200 dark:file:border-neutral-700 file:text-sm file:bg-white dark:file:bg-neutral-800 file:text-neutral-950 dark:file:text-neutral-100 hover:file:bg-neutral-100 dark:hover:file:bg-neutral-700 file:cursor-pointer"
              />
              {csvResult && <p className="text-sm text-neutral-500 mt-3">{csvResult}</p>}
              <div className="flex justify-end mt-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => { setShowCsv(false); setCsvResult(""); }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modal: Corregir puntos */}
      {editPoints && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setEditPoints(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm w-full max-w-sm p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-1">Corregir puntos</h2>
              <p className="text-xs text-neutral-400 mb-4">
                {editPoints.name ?? "Cliente"} · total actual: {editPoints.points}
              </p>
              <input
                type="number"
                min={0}
                max={10}
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value)}
                className="w-full px-3 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-md text-sm bg-white dark:bg-neutral-800 text-neutral-950 dark:text-neutral-100 outline-none focus:border-neutral-950 dark:focus:border-neutral-400"
              />
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="secondary" type="button" onClick={() => setEditPoints(null)}>Cancelar</Button>
                <Button variant="primary" type="button" onClick={handleSetPoints} disabled={savingPoints}>
                  {savingPoints ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Secciones inferiores */}

      {/* Conexiones sociales */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-neutral-950 dark:bg-neutral-100 px-6 py-2.5">
          <h2 className="text-xs font-semibold text-white dark:text-neutral-950 uppercase tracking-wider">
            Redes Sociales
          </h2>
        </div>
        <div className="p-6">
          <SocialConnectionsSection businessId={id} onConnected={load} />
        </div>
      </section>

      {/* Reseñas Google */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-neutral-950 dark:bg-neutral-100 px-6 py-2.5">
          <h2 className="text-xs font-semibold text-white dark:text-neutral-950 uppercase tracking-wider">
            Reputación
          </h2>
        </div>
        <div className="p-6">
          <GoogleReviewsSection businessId={id} googleLink={business?.googleLink ?? ""} features={features} />
        </div>
      </section>

      {/* Bandeja y reportes */}
      <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm overflow-hidden">
        <div className="bg-neutral-950 dark:bg-neutral-100 px-6 py-2.5">
          <h2 className="text-xs font-semibold text-white dark:text-neutral-950 uppercase tracking-wider">
            Bandeja
          </h2>
        </div>
        <div className="p-6 flex flex-col gap-8">
          <SocialInbox businessId={id} features={features} />

          {features.includes("pdf-reports") && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm p-6">
              <h2 className="text-sm font-semibold mb-1">Reporte de plan de acción</h2>
              <p className="text-xs text-neutral-400 mb-3">
                Genera un informe basado en las reseñas negativas.
              </p>
              <a
                href={`/api/report/${id}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-md bg-neutral-950 dark:bg-neutral-100 text-white dark:text-neutral-950 hover:opacity-80 transition-opacity cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Descargar reporte
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Eliminar negocio */}
      <section className="border border-red-200 dark:border-red-900/50 rounded-xl p-6 flex flex-col items-center gap-3 bg-red-50/30 dark:bg-red-950/5">
        <div className="bg-red-100 dark:bg-red-900/30 px-4 py-1.5 rounded-full">
          <h2 className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider">
            Peligro
          </h2>
        </div>
        <p className="text-xs text-neutral-400 text-center">
          Eliminará permanentemente este negocio y todos sus clientes. Esta acción no se puede deshacer.
        </p>
        <button
          type="button"
          onClick={handleDeleteBusiness}
          disabled={deleting}
          className="text-xs font-medium px-4 py-2 rounded-md border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {deleting ? "Eliminando..." : "Eliminar negocio"}
        </button>
      </section>
    </div>
  );
};

export default CustomersPage;
