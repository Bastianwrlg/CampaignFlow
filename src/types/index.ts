export interface ContentItem {
  id: string;
  tanggal: string; // yyyy-MM-dd
  campaign: string;
  influencer: string;
  platform: string;
  postLink: string;
  contentType: string;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalEngagement: number;
  isVerified?: boolean;
  lastSyncedAt?: string;
}

export interface ContractItem {
  id: string;
  influencer: string;
  periodeMulai: string; // yyyy-MM-dd
  periodeSelesai: string; // yyyy-MM-dd
  totalBiaya: number;
}

export interface BenchmarkItem {
  platform: string;
  erBenchmark: number; // percentage, e.g. 2.8
  cpeBenchmark: number; // in IDR, e.g. 1005
  mode: 'Manual' | 'Auto';
}

export interface ComplianceItem {
  id: string;
  influencer: string;
  idKontrak: string;
  brief: number; // 0-5
  messaging: number; // 0-5
  regulasi: number; // 0-5
  teknis: number; // 0-5
  totalNilai: number; // 0-20
  score: number; // mapped 0, 5, 10, 15, 20
}

export interface InfluencerSummaryItem {
  idKontrak: string;
  influencer: string;
  periodeMulai: string;
  periodeSelesai: string;
  platform: string;
  totalContent: number;
  totalReach: number;
  totalEngagement: number;
  erPercent: number;
  totalCost: number;
  cpe: number;
  costPerContent: number;
  cpr: number;
}

export interface RoiScoreItem extends InfluencerSummaryItem {
  erBenchmark: number;
  cpeBenchmark: number;
  erDiffPercent: number;
  cpeDiffPercent: number;
  erScore: number;
  cpeScore: number;
  complianceScore: number;
  totalScore: number;
  kategori: 'High ROI' | 'Medium ROI' | 'Low ROI';
  color: string;
  rekomendasi: string;
}

export interface DashboardStats {
  totalCampaign: number;
  totalContent: number;
  totalReach: number;
  totalEngagement: number;
  platformBreakdown: { platform: string; count: number }[];
  campaignBreakdown: {
    campaign: string;
    reach: number;
    engagement: number;
    contentCount?: number;
    erPercent?: number;
  }[];
  trend: { period: string; count: number }[];
  topInfluencers: {
    influencer: string;
    erPercent: number;
    reach?: number;
    engagement?: number;
    count?: number;
  }[];
  campaignPeriod?: PeriodFilter;
  influencerPeriod?: PeriodFilter;
  campaignDateRangeText?: string;
  influencerDateRangeText?: string;
  selectedCampaign?: string;
  averageEr?: number;
}

export type PeriodFilter = 'all' | '3m' | '6m' | '9m' | '12m';
export type CampaignSortKey = 'reach' | 'engagement' | 'er' | 'content' | 'name';
export type InfluencerSortKey = 'er' | 'engagement' | 'reach' | 'content' | 'name';

export interface CampaignAnalysisItem {
  campaign: string;
  totalContent: number;
  totalReach: number;
  totalEngagement: number;
  erPercent: number;
  influencerCount: number;
  influencers: string[];
  platforms: string[];
}

export interface InfluencerAnalysisItem {
  influencer: string;
  totalContent: number;
  totalReach: number;
  totalEngagement: number;
  erPercent: number;
  campaignCount: number;
  campaigns: string[];
  platforms: string[];
}

export interface PeriodAnalysisResult<T> {
  period: PeriodFilter;
  periodLabel: string;
  dateRangeText: string;
  totalItems: number;
  totalContent: number;
  totalReach: number;
  totalEngagement: number;
  avgErPercent: number;
  items: T[];
}
