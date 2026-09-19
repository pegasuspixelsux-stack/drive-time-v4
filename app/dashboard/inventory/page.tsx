"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { Modal } from "@/components/dashboard/modal";
import { StatusPill } from "@/components/dashboard/status-pill";
import { DashboardField, dashboardInputClass } from "@/components/dashboard/form-field";
import { InstagramPostModal } from "@/components/dashboard/instagram-post-modal";
import { useInventory } from "@/lib/firebase/inventory";
import { uploadInventoryImage } from "@/lib/firebase/storage";
import type { InventoryItem, InventoryStatus } from "@/lib/dashboard-data";
import { fadeUp, staggerContainer } from "@/lib/motion";
import { ALLOWED_IMAGE_HOSTS, isAllowedImageUrl } from "@/lib/image-hosts";

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STATUS_OPTIONS: InventoryStatus[] = ["Available", "Reserved", "Sold"];

const STATUS_TONE: Record<InventoryStatus, "green" | "amber" | "slate"> = {
  Available: "green",
  Reserved: "amber",
  Sold: "slate",
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  Available: "Disponible",
  Reserved: "Reservado",
  Sold: "Vendido",
};

const BODY_TYPE_OPTIONS: InventoryItem["bodyType"][] = ["Sedan", "SUV", "Coupe"];

const BODY_TYPE_LABELS: Record<InventoryItem["bodyType"], string> = {
  Sedan: "Sedán",
  SUV: "SUV",
  Coupe: "Cupé",
};

const FUEL_TYPE_OPTIONS: InventoryItem["fuelType"][] = ["Gasoline", "Hybrid", "Electric"];

const FUEL_TYPE_LABELS: Record<InventoryItem["fuelType"], string> = {
  Gasoline: "Nafta",
  Hybrid: "Híbrido",
  Electric: "Eléctrico",
};

type DraftVehicle = {
  make: string;
  model: string;
  trim: string;
  year: string;
  price: string;
  mileage: string;
  status: InventoryStatus;
  image: string;
  transmission: string;
  fuelType: InventoryItem["fuelType"];
  bodyType: InventoryItem["bodyType"];
  color: string;
  colorHex: string;
};

const EMPTY_DRAFT: DraftVehicle = {
  make: "",
  model: "",
  trim: "",
  year: String(new Date().getFullYear()),
  price: "",
  mileage: "",
  status: "Available",
  image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1600&q=80",
  transmission: "Automatic",
  fuelType: "Gasoline",
  bodyType: "Sedan",
  color: "Jet Black",
  colorHex: "#0a0a0b",
};

function toDraft(item: InventoryItem): DraftVehicle {
  return {
    make: item.make,
    model: item.model,
    trim: item.trim,
    year: String(item.year),
    price: String(item.price),
    mileage: String(item.mileage),
    status: item.status,
    image: item.image,
    transmission: item.transmission,
    fuelType: item.fuelType,
    bodyType: item.bodyType,
    color: item.color,
    colorHex: item.colorHex,
  };
}

export default function InventoryPage() {
  const { items: inventory, loading, error, addVehicle, updateVehicle, deleteVehicle } = useInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string>("");
  const [draft, setDraft] = useState<DraftVehicle>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<{ image?: string }>({});
  const [uploading, setUploading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [instagramItem, setInstagramItem] = useState<InventoryItem | null>(null);
  const [instagramOpen, setInstagramOpen] = useState(false);

  const filtered = useMemo(() => {
    return inventory.filter((item) => {
      const matchesSearch = `${item.make} ${item.model} ${item.trim}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inventory, search, statusFilter]);

  const isDraftValid = Boolean(draft.make.trim() && draft.model.trim() && draft.price.trim());

  const openAddModal = () => {
    setEditingId(null);
    setDraftId(`vehicle-${Date.now()}`);
    setDraft(EMPTY_DRAFT);
    setErrors({});
    setModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingId(item.id);
    setDraftId(item.id);
    setDraft(toDraft(item));
    setErrors({});
    setModalOpen(true);
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setErrors({});
    try {
      const url = await uploadInventoryImage(file, draftId);
      setDraft((d) => ({ ...d, image: url }));
    } catch (error) {
      console.error("uploadInventoryImage failed:", error);
      setErrors({ image: "No se pudo subir la imagen. Intenta de nuevo." });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!isDraftValid) return;

    const trimmedImage = draft.image.trim();
    if (trimmedImage && !isAllowedImageUrl(trimmedImage)) {
      setErrors({
        image: `La URL de la imagen debe estar alojada en: ${ALLOWED_IMAGE_HOSTS.join(", ")}`,
      });
      return;
    }
    setErrors({});

    if (editingId) {
      const existing = inventory.find((item) => item.id === editingId);
      await updateVehicle(editingId, {
        make: draft.make.trim(),
        model: draft.model.trim(),
        trim: draft.trim.trim(),
        year: Number(draft.year) || existing?.year || new Date().getFullYear(),
        price: Number(draft.price) || existing?.price || 0,
        mileage: Number(draft.mileage) || existing?.mileage || 0,
        status: draft.status,
        image: trimmedImage || existing?.image || EMPTY_DRAFT.image,
        transmission: draft.transmission.trim() || existing?.transmission || EMPTY_DRAFT.transmission,
        fuelType: draft.fuelType || existing?.fuelType || EMPTY_DRAFT.fuelType,
        bodyType: draft.bodyType || existing?.bodyType || EMPTY_DRAFT.bodyType,
        color: draft.color.trim() || existing?.color || EMPTY_DRAFT.color,
        colorHex: draft.colorHex.trim() || existing?.colorHex || EMPTY_DRAFT.colorHex,
      });
    } else {
      const newItem: InventoryItem = {
        id: draftId,
        make: draft.make.trim(),
        model: draft.model.trim(),
        trim: draft.trim.trim() || "Base",
        year: Number(draft.year) || new Date().getFullYear(),
        price: Number(draft.price) || 0,
        mileage: Number(draft.mileage) || 0,
        transmission: draft.transmission.trim() || EMPTY_DRAFT.transmission,
        fuelType: draft.fuelType,
        bodyType: draft.bodyType,
        color: draft.color.trim() || EMPTY_DRAFT.color,
        colorHex: draft.colorHex.trim() || EMPTY_DRAFT.colorHex,
        status: draft.status,
        image: trimmedImage || EMPTY_DRAFT.image,
      };
      await addVehicle(newItem);
    }

    setModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    await deleteVehicle(id);
    setConfirmDeleteId(null);
  };

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Inventario</h1>
          <p className="mt-1 text-sm text-slate-500">{inventory.length} vehículos en el lote.</p>
        </div>
        <button
          type="button"
          onClick={openAddModal}
          className="flex h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          <Plus size={16} />
          Agregar Vehículo
        </button>
      </div>

      <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setConfirmDeleteId(null);
            }}
            placeholder="Buscar marca, modelo o versión"
            className={`${dashboardInputClass} pl-10`}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => {
            setStatusFilter(event.target.value as InventoryStatus | "All");
            setConfirmDeleteId(null);
          }}
          className={`${dashboardInputClass} sm:w-48`}
        >
          <option value="All">Todos los estados</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </motion.div>

      <motion.div variants={fadeUp} className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Vehículo</th>
              <th className="px-5 py-3">Año</th>
              <th className="px-5 py-3">Kilometraje</th>
              <th className="px-5 py-3">Precio</th>
              <th className="px-5 py-3">Estado</th>
              <th className="sticky right-0 bg-white px-5 py-3 text-right shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-slate-500">
                  Cargando inventario…
                </td>
              </tr>
            )}
            {!loading && error && (
              <tr>
                <td colSpan={6} className="px-5 py-6 text-center text-sm text-red-600">
                  No se pudo cargar — intenta de nuevo.
                </td>
              </tr>
            )}
            {!loading && filtered.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-11 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      <Image src={item.image} alt={`${item.make} ${item.model}`} fill sizes="56px" className="object-cover" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{item.make} {item.model}</p>
                      <p className="text-xs text-slate-500">{item.trim}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 text-slate-600">{item.year}</td>
                <td className="px-5 py-3 text-slate-600">{item.mileage.toLocaleString()} km</td>
                <td className="px-5 py-3 text-slate-600">{currency.format(item.price)}</td>
                <td className="px-5 py-3">
                  <StatusPill label={STATUS_LABELS[item.status]} tone={STATUS_TONE[item.status]} />
                </td>
                <td className="sticky right-0 bg-white px-5 py-3 shadow-[-8px_0_8px_-8px_rgba(0,0,0,0.12)]">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      aria-label="Generar publicación para Instagram"
                      onClick={() => {
                        setInstagramItem(item);
                        setInstagramOpen(true);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Sparkles size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Editar vehículo"
                      onClick={() => openEditModal(item)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar vehículo"
                      onClick={() => handleDelete(item.id)}
                      className={`flex h-8 items-center justify-center rounded-lg px-2 text-xs font-medium transition-colors ${
                        confirmDeleteId === item.id
                          ? "bg-red-600 text-white hover:bg-red-700"
                          : "text-slate-500 hover:bg-red-50 hover:text-red-600"
                      }`}
                    >
                      {confirmDeleteId === item.id ? "¿Confirmar?" : <Trash2 size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Vehículo" : "Agregar Vehículo"}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <DashboardField label="Marca">
              <input value={draft.make} onChange={(e) => setDraft((d) => ({ ...d, make: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Modelo">
              <input value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
          </div>
          <DashboardField label="Versión">
            <input value={draft.trim} onChange={(e) => setDraft((d) => ({ ...d, trim: e.target.value }))} className={dashboardInputClass} />
          </DashboardField>
          <div className="grid grid-cols-3 gap-4">
            <DashboardField label="Año">
              <input type="number" value={draft.year} onChange={(e) => setDraft((d) => ({ ...d, year: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Precio">
              <input type="number" value={draft.price} onChange={(e) => setDraft((d) => ({ ...d, price: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Kilometraje">
              <input type="number" value={draft.mileage} onChange={(e) => setDraft((d) => ({ ...d, mileage: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
          </div>
          <DashboardField label="Estado">
            <select value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as InventoryStatus }))} className={dashboardInputClass}>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>{STATUS_LABELS[status]}</option>
              ))}
            </select>
          </DashboardField>
          <div className="grid grid-cols-2 gap-4">
            <DashboardField label="Carrocería">
              <select value={draft.bodyType} onChange={(e) => setDraft((d) => ({ ...d, bodyType: e.target.value as InventoryItem["bodyType"] }))} className={dashboardInputClass}>
                {BODY_TYPE_OPTIONS.map((bodyType) => (
                  <option key={bodyType} value={bodyType}>{BODY_TYPE_LABELS[bodyType]}</option>
                ))}
              </select>
            </DashboardField>
            <DashboardField label="Combustible">
              <select value={draft.fuelType} onChange={(e) => setDraft((d) => ({ ...d, fuelType: e.target.value as InventoryItem["fuelType"] }))} className={dashboardInputClass}>
                {FUEL_TYPE_OPTIONS.map((fuelType) => (
                  <option key={fuelType} value={fuelType}>{FUEL_TYPE_LABELS[fuelType]}</option>
                ))}
              </select>
            </DashboardField>
          </div>
          <DashboardField label="Transmisión">
            <input value={draft.transmission} onChange={(e) => setDraft((d) => ({ ...d, transmission: e.target.value }))} className={dashboardInputClass} />
          </DashboardField>
          <div className="grid grid-cols-2 gap-4">
            <DashboardField label="Color">
              <input value={draft.color} onChange={(e) => setDraft((d) => ({ ...d, color: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
            <DashboardField label="Código de Color (Hex)">
              <input value={draft.colorHex} onChange={(e) => setDraft((d) => ({ ...d, colorHex: e.target.value }))} className={dashboardInputClass} />
            </DashboardField>
          </div>
          <DashboardField label="Subir Imagen">
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImageUpload(file);
              }}
              className={dashboardInputClass}
            />
            {uploading && <p className="text-xs text-slate-500">Subiendo imagen…</p>}
          </DashboardField>
          <DashboardField label="URL de Imagen">
            <input
              value={draft.image}
              onChange={(e) => {
                setDraft((d) => ({ ...d, image: e.target.value }));
                setErrors({});
              }}
              className={dashboardInputClass}
            />
            {errors.image && <p className="text-xs text-red-600">{errors.image}</p>}
          </DashboardField>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDraftValid || uploading}
            className="mt-2 flex h-11 items-center justify-center rounded-xl bg-indigo-600 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-indigo-600"
          >
            {editingId ? "Guardar Cambios" : "Agregar Vehículo"}
          </button>
        </div>
      </Modal>

      <InstagramPostModal
        open={instagramOpen}
        onClose={() => setInstagramOpen(false)}
        item={instagramItem}
      />
    </motion.div>
  );
}
