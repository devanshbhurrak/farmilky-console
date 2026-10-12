export type ManifestStatus = 'active' | 'completed' | 'pending' | string;
export type ManifestEntryStatus = 'pending' | 'delivered' | 'failed' | 'skipped';

export interface ManifestEntry {
  id: string;
  customerId?: string | null;
  customerName: string;
  phone?: string | null;
  productLabel?: string | null;
  productName?: string | null;
  quantity?: number;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  sequence: number;
  status: ManifestEntryStatus | string;
  deliveryNotes?: string | null;
  failureReason?: string | null;
  subscriptionId?: string | null;
  orderId?: string | null;
}

export interface Manifest {
  id: string;
  agentId: string | { id: string; name: string; phone?: string | null };
  agentName?: string;
  areaId?: string | { id: string; name: string } | null;
  areaName?: string | null;
  date: string;
  slot?: string;
  status: ManifestStatus;
  entries?: ManifestEntry[];
  summary?: { total: number; delivered: number; failed: number; pending: number };
  createdAt: string;
}

export interface ManifestListParams {
  page?: number;
  limit?: number;
  date?: string;
  slot?: string;
  agentId?: string;
  status?: string;
}
