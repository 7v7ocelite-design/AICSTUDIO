"use client";

interface Asset {
  id: string;
  url: string;
  filename: string;
  asset_type: string;
  label?: string;
}

interface AssetGridProps {
  assets: Asset[];
  onDelete?: (id: string) => void;
}

export const AssetGrid = ({ assets, onDelete }: AssetGridProps) => {
  if (!assets || assets.length === 0) {
    return (
      <div className="border-2 border-dashed border-neutral-700 rounded-lg p-6 text-center">
        <p className="text-sm text-muted">No assets uploaded yet</p>
        <p className="text-[10px] text-muted mt-1">Upload reference photos and videos for AI-generated content</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
      {assets.map((asset) => (
        <div key={asset.id} className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-950 border border-[var(--border-subtle)]">
          {asset.asset_type === "video" ? (
            <video src={asset.url} className="w-full h-full object-cover" muted />
          ) : (
            <img src={asset.url} alt={asset.filename} className="w-full h-full object-cover" />
          )}
          <span className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded ${
            asset.asset_type === "video" ? "bg-purple-600/80" : asset.asset_type === "logo" ? "bg-blue-600/80" : "bg-neutral-700/80"
          } text-white`}>{asset.asset_type}</span>
          {onDelete && (
            <button
              onClick={() => { if (confirm("Delete this asset?")) onDelete(asset.id); }}
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 bg-red-900/80 hover:bg-red-700 rounded text-[10px] text-white transition-opacity"
            >✕</button>
          )}
          {asset.label && <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[9px] text-slate-300 px-2 py-0.5 truncate">{asset.label}</span>}
        </div>
      ))}
    </div>
  );
};
