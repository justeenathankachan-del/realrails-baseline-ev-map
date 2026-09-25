"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function AboutModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[999]">
      <div className="bg-[#07121F] border border-cyan-400/30 rounded-xl w-[500px] p-6 text-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            About EV Network Command Centre
          </h2>
          <button onClick={onClose}>✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <p><b>Developer:</b> Justeena Thankachan</p>
          <p><b>Technology:</b> FastAPI · Next.js · MapLibre</p>
          <p><b>Version:</b> Phase 0</p>
        </div>
      </div>
    </div>
  );
}