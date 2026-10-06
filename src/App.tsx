import React, { useEffect, useState } from 'react';
import { Sidebar, PageId } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { Toast } from './components/Toast';
import { DashboardView } from './components/views/DashboardView';
import { InputDataView } from './components/views/InputDataView';
import { DataKontenView } from './components/views/DataKontenView';
import { KontrakView } from './components/views/KontrakView';
import { SummaryView } from './components/views/SummaryView';
import { RoiView } from './components/views/RoiView';
import { BenchmarkView } from './components/views/BenchmarkView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { SourceFilesView } from './components/views/SourceFilesView';
import { campaignStore } from './services/campaignStore';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [, setTick] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastIsError, setToastIsError] = useState<boolean>(false);

  // Subscribe to reactive updates from campaignStore
  useEffect(() => {
    const unsubscribe = campaignStore.subscribe(() => {
      setTick((t) => t + 1);
    });
    return unsubscribe;
  }, []);

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setToastIsError(isError);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleResetData = () => {
    if (window.confirm('Reset seluruh data ke contoh awal bawaan sistem?')) {
      campaignStore.resetToInitialData();
      showToast('Data berhasil di-reset ke nilai awal contoh.');
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1120] text-[#f1f5f9] flex font-sans selection:bg-[#06d6a0] selection:text-[#06121f]">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={(page) => setCurrentPage(page)}
        onResetData={handleResetData}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-5 sm:p-7 overflow-y-auto max-h-screen">
        <Topbar currentPage={currentPage} />

        {/* View Switcher */}
        <div className="animate-fade-in">
          {currentPage === 'dashboard' && <DashboardView />}
          {currentPage === 'input-data' && (
            <InputDataView
              onNotify={showToast}
              onSuccess={() => setCurrentPage('data-konten')}
            />
          )}
          {currentPage === 'data-konten' && (
            <DataKontenView
              onNotify={showToast}
              onGoToInput={() => setCurrentPage('input-data')}
            />
          )}
          {currentPage === 'kontrak' && <KontrakView onNotify={showToast} />}
          {currentPage === 'summary' && <SummaryView />}
          {currentPage === 'roi' && <RoiView onNotify={showToast} />}
          {currentPage === 'benchmark' && <BenchmarkView onNotify={showToast} />}
          {currentPage === 'diagnostics' && <DiagnosticsView onNotify={showToast} />}
          {currentPage === 'source-files' && <SourceFilesView onNotify={showToast} />}
        </div>
      </main>

      {/* Toast popup */}
      <Toast message={toastMessage} isError={toastIsError} />
    </div>
  );
}
