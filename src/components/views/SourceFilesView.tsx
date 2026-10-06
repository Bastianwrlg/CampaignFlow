import React, { useState } from 'react';
import { rawSourceFiles, RawFile } from '../../data/rawSourceFiles';
import { Copy, Check, FileCode2, BookOpen } from 'lucide-react';

interface SourceFilesViewProps {
  onNotify: (msg: string) => void;
}

export const SourceFilesView: React.FC<SourceFilesViewProps> = ({ onNotify }) => {
  const [selectedFile, setSelectedFile] = useState<RawFile>(rawSourceFiles[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = (content: string, name: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    onNotify(`File "${name}" berhasil disalin ke clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* File List */}
      <div className="lg:col-span-4 bg-[#16213a] border border-[#253449] rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#253449]">
          <FileCode2 className="w-4 h-4 text-[#06d6a0]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Daftar File Apps Script
          </h3>
        </div>

        <div className="space-y-1 max-h-[70vh] overflow-y-auto pr-1">
          {rawSourceFiles.map((file) => {
            const isSelected = selectedFile.name === file.name;
            return (
              <button
                key={file.name}
                onClick={() => {
                  setSelectedFile(file);
                  setCopied(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#1e2a44] text-[#06d6a0] font-bold border border-[#06d6a0]/30'
                    : 'text-[#94a3b8] hover:bg-[#182337] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                      file.type === 'gs'
                        ? 'bg-blue-500/20 text-blue-400'
                        : file.type === 'html'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    .{file.type}
                  </span>
                  <span className="truncate">{file.name}</span>
                </div>
                <span className="text-[10px] text-[#64748b] shrink-0">{file.category}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-[#253449]/70 text-[11px] text-[#94a3b8] leading-relaxed">
          <div className="flex items-center gap-1.5 text-white font-semibold mb-1">
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Cara Pakai di Google Sheets:</span>
          </div>
          Buka Google Sheets &rarr; Extensions &rarr; Apps Script &rarr; Buat file dengan nama sama &rarr; Paste kodenya.
        </div>
      </div>

      {/* Code Viewer */}
      <div className="lg:col-span-8 bg-[#16213a] border border-[#253449] rounded-xl p-5 shadow-sm relative overflow-hidden flex flex-col">
        <div className="h-1 w-full bg-gradient-to-r from-[#06d6a0] via-[#3b82f6] to-[#8b5cf6] absolute top-0 left-0" />

        <div className="flex items-center justify-between pb-3 border-b border-[#253449] mb-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="font-mono text-cyan-400">{selectedFile.name}</span>
              <span className="text-[10px] font-semibold text-[#94a3b8] bg-[#0f1729] px-2 py-0.5 rounded border border-[#253449]">
                {selectedFile.category}
              </span>
            </h3>
            <p className="text-[11px] text-[#64748b] mt-0.5">
              {selectedFile.content.split('\n').length} baris kode
            </p>
          </div>

          <button
            onClick={() => handleCopy(selectedFile.content, selectedFile.name)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06d6a0] hover:bg-[#10b981] text-[#06121f] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin File'}</span>
          </button>
        </div>

        <pre className="font-mono text-xs bg-[#0b1120] text-[#f1f5f9] border border-[#253449] p-4 rounded-xl overflow-x-auto leading-relaxed shadow-inner max-h-[65vh] select-text">
          {selectedFile.content}
        </pre>
      </div>
    </div>
  );
};
