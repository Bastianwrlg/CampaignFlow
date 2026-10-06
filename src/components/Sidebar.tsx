import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FileSpreadsheet,
  FileSignature,
  BarChart3,
  Target,
  SlidersHorizontal,
  Wrench,
  Code2,
  RotateCcw,
} from 'lucide-react';
import { APP_VERSION } from '../data/initialData';

export type PageId =
  | 'dashboard'
  | 'input-data'
  | 'data-konten'
  | 'kontrak'
  | 'summary'
  | 'roi'
  | 'benchmark'
  | 'diagnostics'
  | 'source-files';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onResetData: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  onResetData,
}) => {
  return (
    <aside className="w-[240px] bg-[#131c2e] border-r border-[#253449] p-4 flex flex-col justify-between shrink-0 select-none min-h-screen">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[19px] font-extrabold tracking-tight text-white">CampaignFlow</span>
          <span className="bg-gradient-to-br from-[#06d6a0] to-[#3b82f6] text-[#06121f] text-[10px] font-extrabold px-1.5 py-0.5 rounded tracking-wide">
            PODA
          </span>
        </div>
        <div className="text-[10px] font-semibold tracking-wider text-[#64748b] mb-1">
          INFLUENCER ANALYTICS V1.0
        </div>
        <div className="text-[10px] font-medium text-amber-400/90 mb-5 tracking-tight truncate" title={APP_VERSION}>
          {APP_VERSION}
        </div>

        {/* Menu Utama */}
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#64748b] px-2 mb-2">
          Menu Utama
        </div>
        <nav className="space-y-1 mb-5">
          <button
            onClick={() => onSelectPage('dashboard')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'dashboard'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-[#06d6a0]" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => onSelectPage('input-data')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'input-data'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 text-[#3b82f6]" />
            <span>Input Data</span>
          </button>
          <button
            onClick={() => onSelectPage('data-konten')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'data-konten'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#8b5cf6]" />
            <span>Data Konten</span>
          </button>
        </nav>

        {/* Modul */}
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#64748b] px-2 mb-2">
          Modul
        </div>
        <nav className="space-y-1 mb-5">
          <button
            onClick={() => onSelectPage('kontrak')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'kontrak'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <FileSignature className="w-4 h-4 text-emerald-400" />
            <span>Kontrak Influencer</span>
          </button>
          <button
            onClick={() => onSelectPage('summary')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'summary'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>Summary Influencer</span>
          </button>
          <button
            onClick={() => onSelectPage('roi')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'roi'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <Target className="w-4 h-4 text-amber-400" />
            <span>ROI Calculator</span>
          </button>
          <button
            onClick={() => onSelectPage('benchmark')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'benchmark'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 text-violet-400" />
            <span>Pengaturan Benchmark</span>
          </button>
        </nav>

        {/* Developer & Tools */}
        <div className="text-[10px] uppercase font-bold tracking-wider text-[#64748b] px-2 mb-2">
          Tools & Source
        </div>
        <nav className="space-y-1">
          <button
            onClick={() => onSelectPage('diagnostics')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'diagnostics'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            <span>Run Diagnostics</span>
          </button>
          <button
            onClick={() => onSelectPage('source-files')}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-semibold transition-all ${
              currentPage === 'source-files'
                ? 'bg-[#1b2740] text-white shadow-sm'
                : 'text-[#94a3b8] hover:bg-[#1b2740]/60 hover:text-white'
            }`}
          >
            <Code2 className="w-4 h-4 text-sky-400" />
            <span>Source Files (.gs/.html)</span>
          </button>
        </nav>
      </div>

      {/* Footer action */}
      <div className="pt-4 border-t border-[#253449]/70">
        <button
          onClick={onResetData}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-[#94a3b8] bg-[#0f1729] hover:bg-[#1e2a44] hover:text-amber-300 transition-colors border border-[#253449]"
          title="Kembalikan data contoh awal"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Data Contoh</span>
        </button>
      </div>
    </aside>
  );
};
