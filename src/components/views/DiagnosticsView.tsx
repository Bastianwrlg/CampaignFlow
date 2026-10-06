import React, { useState } from 'react';
import { campaignStore } from '../../services/campaignStore';
import { Wrench, CheckCircle2, Copy } from 'lucide-react';

interface DiagnosticsViewProps {
  onNotify: (msg: string, isError?: boolean) => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ onNotify }) => {
  const [report, setReport] = useState<string>(() => campaignStore.runDiagnostics());

  const handleRun = () => {
    const result = campaignStore.runDiagnostics();
    setReport(result);
    onNotify('Diagnostics selesai dijalankan.');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    onNotify('Laporan diagnostics disalin ke clipboard.');
  };

  return (
    <div className="bg-[#16213a] border border-[#253449] rounded-xl p-6 shadow-sm relative overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-[#3b82f6] to-[#06d6a0] absolute top-0 left-0" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-extrabold text-white flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <span>Diagnostic & Health Report</span>
          </h2>
          <p className="text-xs text-[#94a3b8] mt-0.5">
            Menjalankan pengecekan integritas data sheet, formula analitika, dan validitas kontrak influencer.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-95 text-[#06121f] font-bold text-xs rounded-lg transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Run Diagnostics Ulang</span>
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#1e2a44] hover:bg-[#253449] text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5 text-[#06d6a0]" />
            <span>Salin Laporan</span>
          </button>
        </div>
      </div>

      <pre className="font-mono text-xs bg-[#0b1120] text-emerald-400/90 border border-[#253449] p-4 rounded-xl overflow-x-auto leading-relaxed shadow-inner max-h-[60vh]">
        {report}
      </pre>
    </div>
  );
};
