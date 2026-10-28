export type DeliveryBoardType = 'subscription' | 'order';
export type DeliveryBoardStatus = 'pending' | 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';

export interface DeliveryBoardEntry {
  id: string;
  userId: string;
  customerName: string;
  phone?: string | null;
  email?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  type: DeliveryBoardType | string;
  subscriptionId?: string | null;
  deliverySlot?: 'morning' | 'evening' | null;
  orderId?: string | null;
  productId?: string | null;
  productName?: string | null;
  deliveryStatus: DeliveryBoardStatus | string;
  quantity: number;
  scheduledQuantity?: number;
  actualQuantity?: number | null;
  volumeInLiters?: number;
  unit?: string | null;
  outcome?: { actualQuantity?: number; notes?: string | null } | null;
  canRecordOutcome?: boolean;
  sequence?: number;
}

export interface DeliveryBoardResponse {
  entries?: DeliveryBoardEntry[];
  data?: DeliveryBoardEntry[];
  summary?: {
    total?: number;
    remainingDeliveries?: number;
    delivered?: number;
    pending?: number;
  };
}

export interface OutcomeInput {
  status: 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped';
  actualQuantity?: number;
  reason?: string;
  notes?: string;
  deliveryDate?: string;
}
