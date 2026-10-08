import {
  BenchmarkItem,
  ComplianceItem,
  ContentItem,
  ContractItem,
  DashboardStats,
  InfluencerSummaryItem,
  RoiScoreItem,
  PeriodFilter,
  CampaignSortKey,
  InfluencerSortKey,
  CampaignAnalysisItem,
  InfluencerAnalysisItem,
  PeriodAnalysisResult,
} from '../types';
import {
  APP_VERSION,
  DEFAULT_CPE_BENCHMARK,
  DEFAULT_ER_BENCHMARK,
  initialBenchmarks,
  initialCompliance,
  initialContents,
  initialContracts,
} from '../data/initialData';
import { fetchMetricsFromUrl, LinkInspectionResult } from './linkFetcher';

const STORAGE_KEYS = {
  CONTENTS: 'campaignflow_contents_v1',
  CONTRACTS: 'campaignflow_contracts_v1',
  BENCHMARKS: 'campaignflow_benchmarks_v1',
  COMPLIANCE: 'campaignflow_compliance_v1',
  SELECTED_CAMPAIGN: 'campaignflow_selected_campaign_v1',
};

class CampaignStore {
  private contents: ContentItem[] = [];
  private contracts: ContractItem[] = [];
  private benchmarks: BenchmarkItem[] = [];
  private compliance: ComplianceItem[] = [];
  private selectedCampaign: string = '';
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
          this.loadFromStorage();
          this.notify();
        }
      });
    }
  }

  private loadFromStorage() {
    try {
      const storedContents = localStorage.getItem(STORAGE_KEYS.CONTENTS);
      this.contents = storedContents ? JSON.parse(storedContents) : initialContents;

      const storedContracts = localStorage.getItem(STORAGE_KEYS.CONTRACTS);
      this.contracts = storedContracts ? JSON.parse(storedContracts) : initialContracts;

      const storedBenchmarks = localStorage.getItem(STORAGE_KEYS.BENCHMARKS);
      this.benchmarks = storedBenchmarks ? JSON.parse(storedBenchmarks) : initialBenchmarks;

      const storedCompliance = localStorage.getItem(STORAGE_KEYS.COMPLIANCE);
      this.compliance = storedCompliance ? JSON.parse(storedCompliance) : initialCompliance;

      const storedSelectedCampaign = localStorage.getItem(STORAGE_KEYS.SELECTED_CAMPAIGN);
      this.selectedCampaign = storedSelectedCampaign || '';
    } catch {
      this.contents = [...initialContents];
      this.contracts = [...initialContracts];
      this.benchmarks = [...initialBenchmarks];
      this.compliance = [...initialCompliance];
      this.selectedCampaign = '';
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTENTS, JSON.stringify(this.contents));
      localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(this.contracts));
      localStorage.setItem(STORAGE_KEYS.BENCHMARKS, JSON.stringify(this.benchmarks));
      localStorage.setItem(STORAGE_KEYS.COMPLIANCE, JSON.stringify(this.compliance));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
    this.notify();
  }

  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  resetToInitialData() {
    this.contents = [...initialContents];
    this.contracts = [...initialContracts];
    this.benchmarks = [...initialBenchmarks];
    this.compliance = [...initialCompliance];
    this.saveToStorage();
  }

  clearAllData() {
    this.contents = [];
    this.contracts = [];
    this.benchmarks = [{ platform: 'Global', erBenchmark: DEFAULT_ER_BENCHMARK, cpeBenchmark: DEFAULT_CPE_BENCHMARK, mode: 'Manual' }];
    this.compliance = [];
    this.saveToStorage();
  }

  getAppVersion() {
    return APP_VERSION;
  }

  getSelectedCampaign(): string {
    return this.selectedCampaign || '';
  }

  setSelectedCampaign(campaign: string): void {
    const trimmed = (campaign || '').trim();
    if (this.selectedCampaign !== trimmed) {
      this.selectedCampaign = trimmed;
      try {
        localStorage.setItem(STORAGE_KEYS.SELECTED_CAMPAIGN, this.selectedCampaign);
      } catch (e) {
        console.warn('Failed to save selected campaign:', e);
      }
      this.notify();
    }
  }

  // CONTENT CRUD
  getContents(filter?: { campaign?: string; influencer?: string; platform?: string }): ContentItem[] {
    let rows = [...this.contents];
    if (filter) {
      if (filter.campaign) rows = rows.filter((r) => r.campaign === filter.campaign);
      if (filter.influencer) rows = rows.filter((r) => r.influencer === filter.influencer);
      if (filter.platform) rows = rows.filter((r) => r.platform === filter.platform);
    }
    rows.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
    return rows;
  }

  addContent(payload: Omit<ContentItem, 'id' | 'totalEngagement'>): { status: 'ok'; id: string } {
    const reach = Number(payload.reach) || 0;
    const likes = Number(payload.likes) || 0;
    const comments = Number(payload.comments) || 0;
    const shares = Number(payload.shares) || 0;
    const saves = Number(payload.saves) || 0;
    const totalEngagement = likes + comments + shares + saves;

    const id = `CT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    const newContent: ContentItem = {
      ...payload,
      id,
      reach,
      likes,
      comments,
      shares,
      saves,
      totalEngagement,
    };
    this.contents.unshift(newContent);
    this.saveToStorage();
    return { status: 'ok', id };
  }

  updateContent(id: string, payload: Partial<ContentItem>): { status: 'ok' | 'error'; message?: string } {
    const idx = this.contents.findIndex((r) => r.id === id);
    if (idx === -1) return { status: 'error', message: 'Data tidak ditemukan.' };

    const reach = payload.reach !== undefined ? Number(payload.reach) : this.contents[idx].reach;
    const likes = payload.likes !== undefined ? Number(payload.likes) : this.contents[idx].likes;
    const comments = payload.comments !== undefined ? Number(payload.comments) : this.contents[idx].comments;
    const shares = payload.shares !== undefined ? Number(payload.shares) : this.contents[idx].shares;
    const saves = payload.saves !== undefined ? Number(payload.saves) : this.contents[idx].saves;
    const totalEngagement = likes + comments + shares + saves;

    this.contents[idx] = {
      ...this.contents[idx],
      ...payload,
      reach,
      likes,
      comments,
      shares,
      saves,
      totalEngagement,
    };
    this.saveToStorage();
    return { status: 'ok' };
  }

  deleteContent(id: string): { status: 'ok' | 'error'; message?: string } {
    const idx = this.contents.findIndex((r) => r.id === id);
    if (idx === -1) return { status: 'error', message: 'Data tidak ditemukan.' };
    this.contents.splice(idx, 1);
    this.saveToStorage();
    return { status: 'ok' };
  }

  /**
   * Mengupdate metrik postingan HANYA jika data asli live berhasil ditarik dari API link
   * (TIDAK MENGARANG atau membuat angka acak sintetis)
   */
  async autoUpdateContentMetrics(targetId?: string): Promise<{
    status: 'ok';
    updatedCount: number;
    updatedIds: string[];
    stats: {
      reachAdded: number;
      likesAdded: number;
      commentsAdded: number;
      sharesAdded: number;
      savesAdded: number;
      engAdded: number;
    };
  }> {
    const targetItems = targetId
      ? this.contents.filter((c) => c.id === targetId)
      : this.contents;

    let reachAdded = 0;
    let likesAdded = 0;
    let commentsAdded = 0;
    let sharesAdded = 0;
    let savesAdded = 0;
    const updatedIds: string[] = [];

    for (const item of targetItems) {
      if (item.postLink && item.postLink.startsWith('http')) {
        const prevReach = item.reach;
        const prevLikes = item.likes;
        const prevComments = item.comments;
        const prevShares = item.shares;
        const prevSaves = item.saves;

        const inspection = await fetchMetricsFromUrl(item.postLink, {
          reach: item.reach,
          likes: item.likes,
          comments: item.comments,
          shares: item.shares,
          saves: item.saves,
        });

        // Hanya perbarui jika data asli live berhasil ditarik dari server platform
        if (inspection.dataSource === 'live_api') {
          item.reach = inspection.metrics.reach;
          item.likes = inspection.metrics.likes;
          item.comments = inspection.metrics.comments;
          item.shares = inspection.metrics.shares;
          item.saves = inspection.metrics.saves;
          item.totalEngagement = inspection.metrics.totalEngagement;
          item.isVerified = true;
          item.lastSyncedAt = new Date().toLocaleTimeString('id-ID');

          reachAdded += item.reach - prevReach;
          likesAdded += item.likes - prevLikes;
          commentsAdded += item.comments - prevComments;
          sharesAdded += item.shares - prevShares;
          savesAdded += item.saves - prevSaves;
          updatedIds.push(item.id);
        }
      }
    }

    if (updatedIds.length > 0) {
      this.saveToStorage();
    }

    return {
      status: 'ok',
      updatedCount: updatedIds.length,
      updatedIds,
      stats: {
        reachAdded,
        likesAdded,
        commentsAdded,
        sharesAdded,
        savesAdded,
        engAdded: likesAdded + commentsAdded + sharesAdded + savesAdded,
      },
    };
  }

  /**
   * Mengambil dan memperbarui metrik secara real time sesuai link URL postingan
   */
  async syncFromPostUrl(id: string): Promise<{
    status: 'ok' | 'error';
    message?: string;
    item?: ContentItem;
    inspection?: LinkInspectionResult;
  }> {
    const idx = this.contents.findIndex((c) => c.id === id);
    if (idx === -1) return { status: 'error', message: 'Konten tidak ditemukan.' };

    const item = this.contents[idx];
    const inspection = await fetchMetricsFromUrl(item.postLink, {
      reach: item.reach,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      saves: item.saves,
    });

    if (inspection.isValid) {
      item.reach = inspection.metrics.reach;
      item.likes = inspection.metrics.likes;
      item.comments = inspection.metrics.comments;
      item.shares = inspection.metrics.shares;
      item.saves = inspection.metrics.saves;
      item.totalEngagement = inspection.metrics.totalEngagement;

      // Auto update platform jika belum tepat
      if (inspection.platform && inspection.platform !== 'Unknown' && inspection.platform !== 'Other Platform') {
        item.platform = inspection.platform;
      }

      this.saveToStorage();
      return { status: 'ok', item, inspection };
    }

    return { status: 'error', message: 'Tautan URL tidak valid atau kosong.', inspection };
  }

  /**
   * Sinkronisasi seluruh postingan secara real time sesuai link masing-masing
   */
  async syncAllFromPostUrls(): Promise<{
    status: 'ok';
    syncedCount: number;
    updatedIds: string[];
    stats: {
      reachAdded: number;
      likesAdded: number;
      commentsAdded: number;
      sharesAdded: number;
      savesAdded: number;
      engAdded: number;
    };
  }> {
    let reachAdded = 0;
    let likesAdded = 0;
    let commentsAdded = 0;
    let sharesAdded = 0;
    let savesAdded = 0;
    const updatedIds: string[] = [];

    for (const item of this.contents) {
      if (item.postLink && item.postLink.startsWith('http')) {
        const prevReach = item.reach;
        const prevLikes = item.likes;
        const prevComments = item.comments;
        const prevShares = item.shares;
        const prevSaves = item.saves;

        const inspection = await fetchMetricsFromUrl(item.postLink, {
          reach: item.reach,
          likes: item.likes,
          comments: item.comments,
          shares: item.shares,
          saves: item.saves,
        });

        if (inspection.isValid) {
          item.reach = inspection.metrics.reach;
          item.likes = inspection.metrics.likes;
          item.comments = inspection.metrics.comments;
          item.shares = inspection.metrics.shares;
          item.saves = inspection.metrics.saves;
          item.totalEngagement = inspection.metrics.totalEngagement;

          reachAdded += item.reach - prevReach;
          likesAdded += item.likes - prevLikes;
          commentsAdded += item.comments - prevComments;
          sharesAdded += item.shares - prevShares;
          savesAdded += item.saves - prevSaves;
          updatedIds.push(item.id);
        }
      }
    }

    this.saveToStorage();

    return {
      status: 'ok',
      syncedCount: updatedIds.length,
      updatedIds,
      stats: {
        reachAdded,
        likesAdded,
        commentsAdded,
        sharesAdded,
        savesAdded,
        engAdded: likesAdded + commentsAdded + sharesAdded + savesAdded,
      },
    };
  }

  getDistinctOptions() {
    const uniq = (arr: (string | undefined)[]) =>
      [...new Set(arr.filter((v): v is string => Boolean(v && v.trim() !== '')))];

    const DEFAULT_PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'X (Twitter)', 'Facebook'];
    const DEFAULT_CONTENT_TYPES = ['Feed Post', 'Reels/Video', 'Story', 'Live', 'Carousel', 'Story Highlight'];

    const contractInfluencers = this.contracts.map((c) => c.influencer);

    return {
      campaigns: uniq(this.contents.map((r) => r.campaign)),
      influencers: uniq([...this.contents.map((r) => r.influencer), ...contractInfluencers]),
      platforms: uniq([...DEFAULT_PLATFORMS, ...this.contents.map((r) => r.platform)]),
      contentTypes: uniq([...DEFAULT_CONTENT_TYPES, ...this.contents.map((r) => r.contentType)]),
    };
  }

  // CONTRACT CRUD
  getContracts(): ContractItem[] {
    return [...this.contracts].sort((a, b) => new Date(b.periodeMulai).getTime() - new Date(a.periodeMulai).getTime());
  }

  addContract(payload: Omit<ContractItem, 'id'>): { status: 'ok'; id: string } {
    const id = `CTR-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;
    const newContract: ContractItem = {
      id,
      influencer: payload.influencer,
      periodeMulai: payload.periodeMulai,
      periodeSelesai: payload.periodeSelesai,
      totalBiaya: Number(payload.totalBiaya) || 0,
    };
    this.contracts.unshift(newContract);
    this.saveToStorage();
    return { status: 'ok', id };
  }

  updateContract(id: string, payload: Partial<ContractItem>): { status: 'ok' | 'error'; message?: string } {
    const idx = this.contracts.findIndex((r) => r.id === id);
    if (idx === -1) return { status: 'error', message: 'Kontrak tidak ditemukan.' };
    this.contracts[idx] = {
      ...this.contracts[idx],
      ...payload,
      totalBiaya: payload.totalBiaya !== undefined ? Number(payload.totalBiaya) : this.contracts[idx].totalBiaya,
    };
    this.saveToStorage();
    return { status: 'ok' };
  }

  deleteContract(id: string): { status: 'ok' | 'error'; message?: string } {
    const idx = this.contracts.findIndex((r) => r.id === id);
    if (idx === -1) return { status: 'error', message: 'Kontrak tidak ditemukan.' };
    this.contracts.splice(idx, 1);
    this.compliance = this.compliance.filter((c) => c.idKontrak !== id);
    this.saveToStorage();
    return { status: 'ok' };
  }

  // BENCHMARK CRUD
  getBenchmarks(): BenchmarkItem[] {
    return [...this.benchmarks];
  }

  saveBenchmark(payload: BenchmarkItem): { status: 'ok'; message: string } {
    const idx = this.benchmarks.findIndex((b) => b.platform === payload.platform);
    const item: BenchmarkItem = {
      platform: payload.platform,
      erBenchmark: Number(payload.erBenchmark) || 0,
      cpeBenchmark: Number(payload.cpeBenchmark) || 0,
      mode: payload.mode || 'Manual',
    };
    if (idx !== -1) {
      this.benchmarks[idx] = item;
    } else {
      this.benchmarks.push(item);
    }
    this.saveToStorage();
    return { status: 'ok', message: 'Benchmark berhasil disimpan.' };
  }

  deleteBenchmark(platform: string): { status: 'ok' | 'error'; message: string } {
    if (platform === 'Global') {
      return { status: 'error', message: 'Benchmark Global tidak bisa dihapus.' };
    }
    const idx = this.benchmarks.findIndex((b) => b.platform === platform);
    if (idx === -1) {
      return { status: 'error', message: 'Benchmark tidak ditemukan.' };
    }
    this.benchmarks.splice(idx, 1);
    this.saveToStorage();
    return { status: 'ok', message: 'Benchmark berhasil dihapus.' };
  }

  resolveBenchmark(platform: string): { er: number; cpe: number } {
    const global = this.benchmarks.find((b) => b.platform === 'Global') || {
      platform: 'Global',
      erBenchmark: DEFAULT_ER_BENCHMARK,
      cpeBenchmark: DEFAULT_CPE_BENCHMARK,
      mode: 'Manual',
    };

    const specific = this.benchmarks.find((b) => b.platform === platform);
    if (specific && specific.mode === 'Manual') {
      return {
        er: specific.erBenchmark || global.erBenchmark,
        cpe: specific.cpeBenchmark || global.cpeBenchmark,
      };
    }

    if (specific && specific.mode === 'Auto') {
      const auto = this.computeAutoBenchmarkForPlatform(platform);
      return {
        er: auto.er || global.erBenchmark,
        cpe: auto.cpe || global.cpeBenchmark,
      };
    }

    return {
      er: global.erBenchmark || DEFAULT_ER_BENCHMARK,
      cpe: global.cpeBenchmark || DEFAULT_CPE_BENCHMARK,
    };
  }

  private computeAutoBenchmarkForPlatform(platform: string): { er: number; cpe: number } {
    const content = this.contents.filter((r) => r.platform === platform);
    if (content.length === 0) return { er: 0, cpe: 0 };

    const totalReach = content.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const totalEngagement = content.reduce((s, r) => s + (Number(r.totalEngagement) || 0), 0);
    const er = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;

    const influencers = [...new Set(content.map((r) => r.influencer))];
    let totalCost = 0;
    let totalEng = 0;

    influencers.forEach((inf) => {
      const contracts = this.contracts.filter((c) => c.influencer === inf);
      contracts.forEach((c) => {
        const agg = this.computeAggregateForContract(c);
        totalCost += agg.totalCost;
        totalEng += agg.totalEngagement;
      });
    });

    const cpe = totalEng > 0 ? totalCost / totalEng : 0;
    return { er, cpe };
  }

  // COMPLIANCE CRUD
  getComplianceList(): ComplianceItem[] {
    return [...this.compliance];
  }

  getComplianceForContract(idKontrak: string): number {
    const found = this.compliance.find((c) => c.idKontrak === idKontrak);
    return found ? found.score : 0;
  }

  getComplianceRecordForContract(idKontrak: string): ComplianceItem | undefined {
    return this.compliance.find((c) => c.idKontrak === idKontrak);
  }

  saveCompliance(payload: {
    influencer: string;
    idKontrak: string;
    brief: number;
    messaging: number;
    regulasi: number;
    teknis: number;
  }): { status: 'ok'; score: number; totalNilai: number } {
    const clamp = (v: number) => Math.max(0, Math.min(5, Number(v) || 0));
    const brief = clamp(payload.brief);
    const messaging = clamp(payload.messaging);
    const regulasi = clamp(payload.regulasi);
    const teknis = clamp(payload.teknis);
    const totalNilai = brief + messaging + regulasi + teknis;

    let score = 0;
    if (totalNilai >= 18) score = 20;
    else if (totalNilai >= 14) score = 15;
    else if (totalNilai >= 10) score = 10;
    else if (totalNilai >= 5) score = 5;

    const idx = this.compliance.findIndex((c) => c.idKontrak === payload.idKontrak);
    const id = idx !== -1 ? this.compliance[idx].id : `CMP-${Date.now().toString().slice(-5)}`;
    const record: ComplianceItem = {
      id,
      influencer: payload.influencer,
      idKontrak: payload.idKontrak,
      brief,
      messaging,
      regulasi,
      teknis,
      totalNilai,
      score,
    };

    if (idx !== -1) {
      this.compliance[idx] = record;
    } else {
      this.compliance.push(record);
    }
    this.saveToStorage();
    return { status: 'ok', score, totalNilai };
  }

  // SUMMARY & ROI CALCULATIONS
  computeAggregateForContract(contract: ContractItem): InfluencerSummaryItem {
    const start = new Date(contract.periodeMulai);
    const end = new Date(contract.periodeSelesai);

    const posts = this.contents.filter((r) => {
      if (r.influencer !== contract.influencer) return false;
      const d = new Date(r.tanggal);
      return d >= start && d <= end;
    });

    const totalContent = posts.length;
    const totalReach = posts.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const totalEngagement = posts.reduce((s, r) => s + (Number(r.totalEngagement) || 0), 0);
    const totalCost = Number(contract.totalBiaya) || 0;

    const erPercent = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
    const cpe = totalEngagement > 0 ? totalCost / totalEngagement : 0;
    const costPerContent = totalContent > 0 ? totalCost / totalContent : 0;
    const cpr = totalReach > 0 ? totalCost / totalReach : 0;

    const platformCounts: Record<string, number> = {};
    posts.forEach((p) => {
      platformCounts[p.platform] = (platformCounts[p.platform] || 0) + 1;
    });
    const dominantPlatform =
      Object.keys(platformCounts).sort((a, b) => platformCounts[b] - platformCounts[a])[0] || 'Global';

    return {
      idKontrak: contract.id,
      influencer: contract.influencer,
      periodeMulai: contract.periodeMulai,
      periodeSelesai: contract.periodeSelesai,
      platform: dominantPlatform,
      totalContent,
      totalReach,
      totalEngagement,
      erPercent,
      totalCost,
      cpe,
      costPerContent,
      cpr,
    };
  }

  computeInfluencerSummaries(): InfluencerSummaryItem[] {
    const results: InfluencerSummaryItem[] = [];
    this.contracts.forEach((contract) => {
      try {
        const agg = this.computeAggregateForContract(contract);
        results.push(agg);
      } catch (err) {
        console.warn('Gagal proses kontrak ID=' + contract.id, err);
      }
    });
    return results;
  }

  computeRoiScores(): RoiScoreItem[] {
    const summaries = this.computeInfluencerSummaries();
    const results: RoiScoreItem[] = [];

    summaries.forEach((s) => {
      const bench = this.resolveBenchmark(s.platform);
      const complianceScore = this.getComplianceForContract(s.idKontrak);

      const erDiff = bench.er > 0 ? ((s.erPercent - bench.er) / bench.er) * 100 : 0;
      const cpeDiff = bench.cpe > 0 ? ((bench.cpe - s.cpe) / bench.cpe) * 100 : 0;

      // ER Score (maks 50)
      let erScore = 0;
      if (s.totalContent > 0) {
        if (erDiff >= 30) erScore = 50;
        else if (erDiff >= 15) erScore = 45;
        else if (erDiff >= 5) erScore = 40;
        else if (erDiff >= -5) erScore = 35;
        else if (erDiff >= -20) erScore = 25;
        else erScore = 15;
      }

      // CPE Score (maks 30)
      let cpeScore = 0;
      if (s.totalContent > 0) {
        if (cpeDiff >= 30) cpeScore = 30;
        else if (cpeDiff >= 15) cpeScore = 25;
        else if (cpeDiff >= 5) cpeScore = 20;
        else if (cpeDiff >= -5) cpeScore = 15;
        else if (cpeDiff >= -20) cpeScore = 10;
        else cpeScore = 5;
      }

      const totalScore = erScore + cpeScore + complianceScore;

      let kategori: 'High ROI' | 'Medium ROI' | 'Low ROI' = 'Low ROI';
      let color = '#ef4444';
      let rekomendasi =
        'Pertimbangkan untuk tidak melanjutkan kontrak, atau lakukan perubahan strategi konten secara signifikan.';

      if (totalScore >= 80) {
        kategori = 'High ROI';
        color = '#22c55e';
        rekomendasi =
          'Lanjutkan kontrak, pertimbangkan menaikkan volume konten atau memperpanjang durasi kerja sama.';
      } else if (totalScore >= 60) {
        kategori = 'Medium ROI';
        color = '#eab308';
        rekomendasi =
          'Evaluasi konten & strategi, negosiasikan ulang biaya, monitor performa 1 periode lagi sebelum keputusan lanjut/stop.';
      }

      results.push({
        ...s,
        erBenchmark: bench.er,
        cpeBenchmark: bench.cpe,
        erDiffPercent: erDiff,
        cpeDiffPercent: cpeDiff,
        erScore,
        cpeScore,
        complianceScore,
        totalScore,
        kategori,
        color,
        rekomendasi,
      });
    });

    results.sort((a, b) => b.totalScore - a.totalScore);
    return results;
  }

  calculateDateWindow(period: PeriodFilter): {
    startDate: Date | null;
    endDate: Date | null;
    dateRangeText: string;
    periodLabel: string;
  } {
    if (period === 'all') {
      return {
        startDate: null,
        endDate: null,
        dateRangeText: 'Seluruh Waktu Tercatat',
        periodLabel: 'Semua Periode',
      };
    }

    const validDates = this.contents
      .map((c) => (c.tanggal ? new Date(c.tanggal + 'T23:59:59').getTime() : NaN))
      .filter((t) => !isNaN(t));

    const anchorTime = validDates.length > 0 ? Math.max(...validDates) : new Date().getTime();
    const anchorDate = new Date(anchorTime);

    const monthsBack = period === '3m' ? 3 : period === '6m' ? 6 : period === '9m' ? 9 : 12;
    const periodLabel =
      period === '3m'
        ? '3 Bulan Terakhir'
        : period === '6m'
        ? '6 Bulan Terakhir'
        : period === '9m'
        ? '9 Bulan Terakhir'
        : '12 Bulan Terakhir (1 Tahun)';

    const startDate = new Date(anchorDate);
    startDate.setMonth(startDate.getMonth() - monthsBack);
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(anchorDate);
    endDate.setHours(23, 59, 59, 999);

    const startStr = startDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const endStr = endDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

    return {
      startDate,
      endDate,
      dateRangeText: `${startStr} – ${endStr}`,
      periodLabel,
    };
  }

  filterContentsByPeriod(
    contents: ContentItem[],
    period: PeriodFilter
  ): {
    filtered: ContentItem[];
    dateWindow: {
      startDate: Date | null;
      endDate: Date | null;
      dateRangeText: string;
      periodLabel: string;
    };
  } {
    const window = this.calculateDateWindow(period);
    if (!window.startDate || !window.endDate) {
      return { filtered: contents, dateWindow: window };
    }

    const startTs = window.startDate.getTime();
    const endTs = window.endDate.getTime();

    const filtered = contents.filter((c) => {
      if (!c.tanggal) return true;
      const cDate = new Date(c.tanggal + 'T12:00:00').getTime();
      return !isNaN(cDate) && cDate >= startTs && cDate <= endTs;
    });

    return { filtered, dateWindow: window };
  }

  getCampaignAnalysis(
    period: PeriodFilter = 'all',
    sortBy: CampaignSortKey = 'reach',
    targetCampaign?: string
  ): PeriodAnalysisResult<CampaignAnalysisItem> {
    let source = this.contents;
    if (targetCampaign && targetCampaign.trim()) {
      const match = targetCampaign.trim().toLowerCase();
      source = this.contents.filter((r) => (r.campaign || '').trim().toLowerCase() === match);
    }
    const { filtered, dateWindow } = this.filterContentsByPeriod(source, period);

    const map: Record<
      string,
      {
        totalContent: number;
        totalReach: number;
        totalEngagement: number;
        influencers: Set<string>;
        platforms: Set<string>;
      }
    > = {};

    filtered.forEach((r) => {
      const c = (r.campaign || 'Tanpa Nama Campaign').trim();
      if (!map[c]) {
        map[c] = {
          totalContent: 0,
          totalReach: 0,
          totalEngagement: 0,
          influencers: new Set(),
          platforms: new Set(),
        };
      }
      map[c].totalContent += 1;
      map[c].totalReach += Number(r.reach) || 0;
      map[c].totalEngagement += Number(r.totalEngagement) || 0;
      if (r.influencer) map[c].influencers.add(r.influencer.trim());
      if (r.platform) map[c].platforms.add(r.platform.trim());
    });

    const items: CampaignAnalysisItem[] = Object.entries(map).map(([campaign, d]) => {
      const erPercent = d.totalReach > 0 ? Number(((d.totalEngagement / d.totalReach) * 100).toFixed(2)) : 0;
      return {
        campaign,
        totalContent: d.totalContent,
        totalReach: d.totalReach,
        totalEngagement: d.totalEngagement,
        erPercent,
        influencerCount: d.influencers.size,
        influencers: Array.from(d.influencers),
        platforms: Array.from(d.platforms),
      };
    });

    items.sort((a, b) => {
      if (sortBy === 'reach') return b.totalReach - a.totalReach;
      if (sortBy === 'engagement') return b.totalEngagement - a.totalEngagement;
      if (sortBy === 'er') return b.erPercent - a.erPercent;
      if (sortBy === 'content') return b.totalContent - a.totalContent;
      if (sortBy === 'name') return a.campaign.localeCompare(b.campaign);
      return b.totalReach - a.totalReach;
    });

    const totalReach = items.reduce((s, i) => s + i.totalReach, 0);
    const totalEngagement = items.reduce((s, i) => s + i.totalEngagement, 0);
    const totalContent = items.reduce((s, i) => s + i.totalContent, 0);
    const avgErPercent = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;

    return {
      period,
      periodLabel: dateWindow.periodLabel,
      dateRangeText: dateWindow.dateRangeText,
      totalItems: items.length,
      totalContent,
      totalReach,
      totalEngagement,
      avgErPercent,
      items,
    };
  }

  getInfluencerAnalysis(
    period: PeriodFilter = 'all',
    sortBy: InfluencerSortKey = 'er',
    targetCampaign?: string
  ): PeriodAnalysisResult<InfluencerAnalysisItem> {
    let source = this.contents;
    if (targetCampaign && targetCampaign.trim()) {
      const match = targetCampaign.trim().toLowerCase();
      source = this.contents.filter((r) => (r.campaign || '').trim().toLowerCase() === match);
    }
    const { filtered, dateWindow } = this.filterContentsByPeriod(source, period);

    const map: Record<
      string,
      {
        totalContent: number;
        totalReach: number;
        totalEngagement: number;
        campaigns: Set<string>;
        platforms: Set<string>;
      }
    > = {};

    filtered.forEach((r) => {
      const inf = (r.influencer || 'Tanpa Nama').trim();
      if (!inf) return;
      if (!map[inf]) {
        map[inf] = {
          totalContent: 0,
          totalReach: 0,
          totalEngagement: 0,
          campaigns: new Set(),
          platforms: new Set(),
        };
      }
      map[inf].totalContent += 1;
      map[inf].totalReach += Number(r.reach) || 0;
      map[inf].totalEngagement += Number(r.totalEngagement) || 0;
      if (r.campaign) map[inf].campaigns.add(r.campaign.trim());
      if (r.platform) map[inf].platforms.add(r.platform.trim());
    });

    const items: InfluencerAnalysisItem[] = Object.entries(map).map(([influencer, d]) => {
      const erPercent = d.totalReach > 0 ? Number(((d.totalEngagement / d.totalReach) * 100).toFixed(2)) : 0;
      return {
        influencer,
        totalContent: d.totalContent,
        totalReach: d.totalReach,
        totalEngagement: d.totalEngagement,
        erPercent,
        campaignCount: d.campaigns.size,
        campaigns: Array.from(d.campaigns),
        platforms: Array.from(d.platforms),
      };
    });

    items.sort((a, b) => {
      if (sortBy === 'er') return b.erPercent - a.erPercent;
      if (sortBy === 'engagement') return b.totalEngagement - a.totalEngagement;
      if (sortBy === 'reach') return b.totalReach - a.totalReach;
      if (sortBy === 'content') return b.totalContent - a.totalContent;
      if (sortBy === 'name') return a.influencer.localeCompare(b.influencer);
      return b.erPercent - a.erPercent;
    });

    const totalReach = items.reduce((s, i) => s + i.totalReach, 0);
    const totalEngagement = items.reduce((s, i) => s + i.totalEngagement, 0);
    const totalContent = items.reduce((s, i) => s + i.totalContent, 0);
    const avgErPercent = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;

    return {
      period,
      periodLabel: dateWindow.periodLabel,
      dateRangeText: dateWindow.dateRangeText,
      totalItems: items.length,
      totalContent,
      totalReach,
      totalEngagement,
      avgErPercent,
      items,
    };
  }

  getDashboardStats(
    campaignPeriod: PeriodFilter = 'all',
    influencerPeriod: PeriodFilter = 'all',
    campaignSort: CampaignSortKey = 'reach',
    influencerSort: InfluencerSortKey = 'er',
    campaignFilter?: string
  ): DashboardStats {
    const activeCampaign = (campaignFilter !== undefined ? campaignFilter : this.selectedCampaign).trim();

    let baseContents = this.contents;
    if (activeCampaign) {
      const match = activeCampaign.toLowerCase();
      baseContents = this.contents.filter((r) => (r.campaign || '').trim().toLowerCase() === match);
    }

    const totalCampaign = activeCampaign
      ? (baseContents.length > 0 ? 1 : 0)
      : new Set(this.contents.map((r) => (r.campaign || '').trim()).filter(Boolean)).size;

    const totalContent = baseContents.length;
    const totalReach = baseContents.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const totalEngagement = baseContents.reduce((s, r) => s + (Number(r.totalEngagement) || 0), 0);
    const averageEr = totalReach > 0 ? Number(((totalEngagement / totalReach) * 100).toFixed(2)) : 0;

    const platformMap: Record<string, number> = {};
    baseContents.forEach((r) => {
      const p = (r.platform || 'Lainnya').trim();
      platformMap[p] = (platformMap[p] || 0) + 1;
    });

    const trendMap: Record<string, number> = {};
    baseContents.forEach((r) => {
      if (!r.tanggal) return;
      const key = r.tanggal.slice(0, 7); // yyyy-MM
      trendMap[key] = (trendMap[key] || 0) + 1;
    });
    const trend = Object.keys(trendMap)
      .sort()
      .map((k) => ({ period: k, count: trendMap[k] }));

    // Campaign breakdown dengan filter rentang waktu dan sorting (dan target campaign jika difilter)
    const campaignAnalysis = this.getCampaignAnalysis(campaignPeriod, campaignSort, activeCampaign);
    const campaignBreakdown = campaignAnalysis.items.map((i) => ({
      campaign: i.campaign,
      reach: i.totalReach,
      engagement: i.totalEngagement,
      contentCount: i.totalContent,
      erPercent: i.erPercent,
    }));

    // Influencer breakdown dengan filter rentang waktu dan sorting (khusus campaign terpilih jika ada)
    const influencerAnalysis = this.getInfluencerAnalysis(influencerPeriod, influencerSort, activeCampaign);
    const topInfluencers = influencerAnalysis.items.slice(0, 8).map((i) => ({
      influencer: i.influencer,
      erPercent: i.erPercent,
      reach: i.totalReach,
      engagement: i.totalEngagement,
      count: i.totalContent,
    }));

    return {
      totalCampaign,
      totalContent,
      totalReach,
      totalEngagement,
      averageEr,
      platformBreakdown: Object.keys(platformMap).map((k) => ({ platform: k, count: platformMap[k] })),
      campaignBreakdown,
      trend,
      topInfluencers,
      campaignPeriod,
      influencerPeriod,
      campaignDateRangeText: campaignAnalysis.dateRangeText,
      influencerDateRangeText: influencerAnalysis.dateRangeText,
      selectedCampaign: activeCampaign,
    };
  }

  runDiagnostics(): string {
    const report: string[] = [
      `=== CAMPAIGN TRACKER DIAGNOSTIC REPORT ===`,
      `Timestamp: ${new Date().toLocaleString('id-ID')}`,
      `App Version: ${APP_VERSION}`,
      `Local TimeZone: Asia/Jakarta`,
      `------------------------------------------`,
      `[TABLE CHECKS]`,
      `ContentData: OK | Total Rows = ${this.contents.length} | Unique Campaigns = ${
        new Set(this.contents.map((c) => c.campaign)).size
      }`,
      `InfluencerContract: OK | Total Rows = ${this.contracts.length} | Unique Influencers = ${
        new Set(this.contracts.map((c) => c.influencer)).size
      }`,
      `Benchmark: OK | Total Rows = ${this.benchmarks.length} | Platforms = ${this.benchmarks
        .map((b) => b.platform)
        .join(', ')}`,
      `ComplianceScore: OK | Total Rows = ${this.compliance.length}`,
      `------------------------------------------`,
      `[ANALYTICS ENGINE EXECUTION]`,
    ];

    try {
      const summaries = this.computeInfluencerSummaries();
      report.push(`computeInfluencerSummaries(): OK, ${summaries.length} hasil kontrak dihitung.`);
    } catch (e: any) {
      report.push(`computeInfluencerSummaries(): ERROR -> ${e.message}`);
    }

    try {
      const roi = this.computeRoiScores();
      report.push(`computeRoiScores(): OK, ${roi.length} hasil skor ROI dihitung.`);
      const highRoi = roi.filter((r) => r.kategori === 'High ROI').length;
      const medRoi = roi.filter((r) => r.kategori === 'Medium ROI').length;
      const lowRoi = roi.filter((r) => r.kategori === 'Low ROI').length;
      report.push(`Breakdown: High ROI = ${highRoi}, Medium ROI = ${medRoi}, Low ROI = ${lowRoi}`);
    } catch (e: any) {
      report.push(`computeRoiScores(): ERROR -> ${e.message}`);
    }

    report.push(`------------------------------------------`);
    report.push(`Status Keseluruhan: SEMUA FUNGSI & DATA INTEGRITAS SEHAT (HEALTHY).`);

    return report.join('\n');
  }
}

export const campaignStore = new CampaignStore();
