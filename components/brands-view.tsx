"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Building2, Trash2 } from "lucide-react";
import { useToast } from "@/components/toast";
import { AssetUploader } from "@/components/asset-uploader";
import { AssetGrid } from "@/components/asset-grid";

interface Brand { id: string; name: string; industry?: string; website?: string; tagline?: string; brand_guidelines?: string; primary_color?: string; contact_name?: string; contact_email?: string; }
interface Asset { id: string; url: string; filename: string; asset_type: string; label?: string; }

interface BrandsViewProps {
  accessToken: string;
  onAddBrand: () => void;
}

export const BrandsView = ({ accessToken, onAddBrand }: BrandsViewProps) => {
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch("/api/brands", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { const d = await res.json(); setBrands(d.data ?? []); }
    } catch { /* ignore */ }
  }, [accessToken]);

  useEffect(() => { void loadBrands(); }, [loadBrands]);

  const loadAssets = useCallback(async (brandId: string) => {
    try {
      const res = await fetch(`/api/assets?owner_type=brand&owner_id=${brandId}`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (res.ok) { const d = await res.json(); setAssets(d.data ?? []); }
    } catch { /* ignore */ }
  }, [accessToken]);

  useEffect(() => { if (selectedBrand) void loadAssets(selectedBrand.id); }, [selectedBrand, loadAssets]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this brand and all its assets?")) return;
    await fetch(`/api/brands/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    setBrands((prev) => prev.filter((b) => b.id !== id));
    if (selectedBrand?.id === id) setSelectedBrand(null);
    toast("Brand deleted.", "success");
  };

  const handleDeleteAsset = async (id: string) => {
    await fetch(`/api/assets/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } });
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const filtered = brands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Brands</h2>
          <p className="text-sm text-secondary mt-1">{brands.length} brand{brands.length !== 1 ? "s" : ""} registered</p>
        </div>
        <button className="button-primary flex items-center gap-2" onClick={onAddBrand} type="button"><Plus className="h-4 w-4" /> Add Brand</button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brands..." />
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((brand) => (
          <div key={brand.id} onClick={() => setSelectedBrand(brand)} className="group cursor-pointer rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:border-[var(--border-active)] hover:-translate-y-0.5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {brand.primary_color && <div className="h-8 w-8 rounded-lg border border-[var(--border-subtle)]" style={{ backgroundColor: brand.primary_color }} />}
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{brand.name}</p>
                  <p className="text-xs text-secondary">{brand.industry ?? "No industry"}</p>
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(brand.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-red-500 transition">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            {brand.tagline && <p className="mt-2 text-xs text-muted italic">&ldquo;{brand.tagline}&rdquo;</p>}
          </div>
        ))}
        {filtered.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">{search ? "No brands match." : "No brands yet."}</p>}
      </div>

      {selectedBrand && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBrand(null)}>
          <div className="animate-fade-in mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{selectedBrand.name}</h2>
                {selectedBrand.tagline && <p className="text-xs text-muted italic">{selectedBrand.tagline}</p>}
              </div>
              <button onClick={() => setSelectedBrand(null)} className="rounded-lg p-1.5 text-secondary hover:text-white"><Building2 className="h-5 w-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {selectedBrand.industry && <div><span className="text-muted">Industry:</span> <span className="text-[var(--text-primary)]">{selectedBrand.industry}</span></div>}
              {selectedBrand.website && <div><span className="text-muted">Website:</span> <a href={selectedBrand.website} className="text-accent">{selectedBrand.website}</a></div>}
              {selectedBrand.contact_name && <div><span className="text-muted">Contact:</span> <span className="text-[var(--text-primary)]">{selectedBrand.contact_name}</span></div>}
              {selectedBrand.contact_email && <div><span className="text-muted">Email:</span> <span className="text-[var(--text-primary)]">{selectedBrand.contact_email}</span></div>}
            </div>
            {selectedBrand.brand_guidelines && (
              <div><h3 className="text-xs font-semibold text-secondary mb-1">Brand Guidelines</h3><p className="text-xs text-muted whitespace-pre-wrap">{selectedBrand.brand_guidelines}</p></div>
            )}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-secondary">Brand Assets</h3>
                <AssetUploader ownerType="brand" ownerId={selectedBrand.id} accessToken={accessToken} onUploadComplete={() => loadAssets(selectedBrand.id)} accept="image/*" />
              </div>
              <AssetGrid assets={assets} onDelete={handleDeleteAsset} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
