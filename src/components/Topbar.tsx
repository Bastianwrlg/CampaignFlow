import React, { useEffect, useState } from 'react';
import { PageId } from './Sidebar';

interface TopbarProps {
  currentPage: PageId;
}

const PAGE_TITLES: Record<PageId, string> = {
  'dashboard': 'Dashboard',
  'input-data': 'Input Data',
  'data-konten': 'Data Konten',
  'kontrak': 'Kontrak Influencer',
  'summary': 'Summary Influencer',
  'roi': 'ROI Calculator',
  'benchmark': 'Pengaturan Benchmark',
  'diagnostics': 'System Diagnostics',
  'source-files': 'Source Files (.gs / .html) & Panduan',
};

export const Topbar: React.FC<TopbarProps> = ({ currentPage }) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setDateStr(
        now.toLocaleDateString('id-ID', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      );
      setTimeStr(
        now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-2 border-b border-[#253449]/40">
      <div>
        <h1 className="text-2xl font-extrabold text-[#f1f5f9] tracking-tight">
          {PAGE_TITLES[currentPage]}
        </h1>
        <p className="text-xs text-[#94a3b8] mt-0.5">
          {currentPage === 'dashboard' && 'Ringkasan performa kampanye media sosial & metrik interaksi utama.'}
          {currentPage === 'input-data' && 'Input log performa konten influencer ke dalam basis data.'}
          {currentPage === 'data-konten' && 'Katalog seluruh postingan konten dengan filter dan aksi cepat.'}
          {currentPage === 'kontrak' && 'Kelola periode dan nilai kontrak influencer aktif.'}
          {currentPage === 'summary' && 'Agregasi metrik performa & efisiensi biaya per periode kontrak.'}
          {currentPage === 'roi' && 'Kalkulasi skor ROI berbasis ER, Efisiensi Biaya (CPE), dan Compliance.'}
          {currentPage === 'benchmark' && 'Konfigurasi ambang batas ER & CPE untuk standarisasi penilaian.'}
          {currentPage === 'diagnostics' && 'Verifikasi kesehatan data sheet dan kalkulator performa.'}
          {currentPage === 'source-files' && 'Arsip lengkap file Apps Script dan panduan deployment clasp.'}
        </p>
      </div>

      <div className="text-right bg-[#131c2e] border border-[#253449] px-3.5 py-1.5 rounded-lg shadow-sm shrink-0">
        <div className="text-xs font-bold text-[#f1f5f9] tracking-wide">{dateStr || '-'}</div>
        <div className="text-[11px] text-[#06d6a0] font-mono font-semibold">{timeStr || '-'}</div>
      </div>
    </header>
  );
};
