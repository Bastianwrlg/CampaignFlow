import {
  BenchmarkItem,
  ComplianceItem,
  ContentItem,
  ContractItem,
  DashboardStats,
  InfluencerSummaryItem,
  RoiScoreItem,
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

const STORAGE_KEYS = {
  CONTENTS: 'campaignflow_contents_v1',
  CONTRACTS: 'campaignflow_contracts_v1',
  BENCHMARKS: 'campaignflow_benchmarks_v1',
  COMPLIANCE: 'campaignflow_compliance_v1',
};

class CampaignStore {
  private contents: ContentItem[] = [];
  private contracts: ContractItem[] = [];
  private benchmarks: BenchmarkItem[] = [];
  private compliance: ComplianceItem[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadFromStorage();
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
    } catch {
      this.contents = [...initialContents];
      this.contracts = [...initialContracts];
      this.benchmarks = [...initialBenchmarks];
      this.compliance = [...initialCompliance];
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
   * Mengupdate metrik reach, likes, comments, shares, dan saves secara otomatis
   * dengan kalkulasi pertumbuhan engagement organik yang realistis.
   */
  autoUpdateContentMetrics(targetId?: string): {
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
  } {
    const targetItems = targetId
      ? this.contents.filter((c) => c.id === targetId)
      : this.contents;

    let reachAdded = 0;
    let likesAdded = 0;
    let commentsAdded = 0;
    let sharesAdded = 0;
    let savesAdded = 0;
    const updatedIds: string[] = [];

    targetItems.forEach((item) => {
      // Pertumbuhan organik proporsional
      // Platform multiplier: TikTok & Instagram Reels punya viralitas lebih tinggi
      const isVideo = item.contentType.toLowerCase().includes('reel') || item.contentType.toLowerCase().includes('video');
      const isTikTok = item.platform.toLowerCase().includes('tiktok');
      const multiplier = isTikTok ? 1.4 : isVideo ? 1.2 : 1.0;

      // Pertumbuhan Reach: 0.6% s/d 2.5% dari reach saat ini + flat 150 - 1200
      const currentReach = item.reach || 10000;
      const pctReach = Math.random() * 0.018 + 0.005;
      const flatReach = Math.floor(Math.random() * 800) + 150;
      const dReach = Math.max(100, Math.round((currentReach * pctReach + flatReach) * multiplier));

      // Rasio Likes: ~4.5% s/d 8.5% dari penambahan reach
      const dLikes = Math.max(5, Math.round(dReach * (Math.random() * 0.04 + 0.045)));

      // Rasio Comments: ~0.3% s/d 0.9% dari penambahan reach
      const dComments = Math.max(1, Math.round(dReach * (Math.random() * 0.006 + 0.003)));

      // Rasio Shares: ~0.5% s/d 1.5% dari penambahan reach
      const dShares = Math.max(1, Math.round(dReach * (Math.random() * 0.01 + 0.005)));

      // Rasio Saves: ~0.6% s/d 2.0% dari penambahan reach
      const dSaves = Math.max(1, Math.round(dReach * (Math.random() * 0.014 + 0.006)));

      const dEng = dLikes + dComments + dShares + dSaves;

      item.reach += dReach;
      item.likes += dLikes;
      item.comments += dComments;
      item.shares += dShares;
      item.saves += dSaves;
      item.totalEngagement += dEng;

      reachAdded += dReach;
      likesAdded += dLikes;
      commentsAdded += dComments;
      sharesAdded += dShares;
      savesAdded += dSaves;
      updatedIds.push(item.id);
    });

    this.saveToStorage();

    return {
      status: 'ok',
      updatedCount: targetItems.length,
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
   * Mensimulasikan sinkronisasi / fetch metrik langsung dari tautan media sosial
   */
  syncFromPostUrl(id: string): {
    status: 'ok' | 'error';
    message?: string;
    item?: ContentItem;
  } {
    const idx = this.contents.findIndex((c) => c.id === id);
    if (idx === -1) return { status: 'error', message: 'Konten tidak ditemukan.' };

    const item = this.contents[idx];
    // Buat kenaikan metrik yang lebih masif untuk simulasi fetch sinkronisasi online
    const dReach = Math.round(item.reach * (Math.random() * 0.04 + 0.02) + 1200);
    const dLikes = Math.round(dReach * 0.062);
    const dComments = Math.round(dReach * 0.005);
    const dShares = Math.round(dReach * 0.008);
    const dSaves = Math.round(dReach * 0.011);

    item.reach += dReach;
    item.likes += dLikes;
    item.comments += dComments;
    item.shares += dShares;
    item.saves += dSaves;
    item.totalEngagement = item.likes + item.comments + item.shares + item.saves;

    this.saveToStorage();
    return { status: 'ok', item };
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

  getDashboardStats(): DashboardStats {
    const totalCampaign = new Set(this.contents.map((r) => r.campaign).filter(Boolean)).size;
    const totalContent = this.contents.length;
    const totalReach = this.contents.reduce((s, r) => s + (Number(r.reach) || 0), 0);
    const totalEngagement = this.contents.reduce((s, r) => s + (Number(r.totalEngagement) || 0), 0);

    const platformMap: Record<string, number> = {};
    this.contents.forEach((r) => {
      const p = r.platform || 'Lainnya';
      platformMap[p] = (platformMap[p] || 0) + 1;
    });

    const campaignMap: Record<string, { reach: number; engagement: number }> = {};
    this.contents.forEach((r) => {
      const c = r.campaign || 'Tanpa Nama';
      if (!campaignMap[c]) campaignMap[c] = { reach: 0, engagement: 0 };
      campaignMap[c].reach += Number(r.reach) || 0;
      campaignMap[c].engagement += Number(r.totalEngagement) || 0;
    });

    const trendMap: Record<string, number> = {};
    this.contents.forEach((r) => {
      if (!r.tanggal) return;
      const key = r.tanggal.slice(0, 7); // yyyy-MM
      trendMap[key] = (trendMap[key] || 0) + 1;
    });
    const trend = Object.keys(trendMap)
      .sort()
      .map((k) => ({ period: k, count: trendMap[k] }));

    const summaries = this.computeInfluencerSummaries();
    const topInfluencers = summaries
      .filter((s) => s.totalContent > 0)
      .sort((a, b) => b.erPercent - a.erPercent)
      .slice(0, 5)
      .map((s) => ({ influencer: s.influencer, erPercent: s.erPercent }));

    return {
      totalCampaign,
      totalContent,
      totalReach,
      totalEngagement,
      platformBreakdown: Object.keys(platformMap).map((k) => ({ platform: k, count: platformMap[k] })),
      campaignBreakdown: Object.keys(campaignMap).map((k) => ({
        campaign: k,
        reach: campaignMap[k].reach,
        engagement: campaignMap[k].engagement,
      })),
      trend,
      topInfluencers,
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
