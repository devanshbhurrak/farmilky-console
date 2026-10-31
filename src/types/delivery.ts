export type DeliveryBoardType = 'subscription' | 'order';
export type DeliveryBoardStatus =
  | 'pending'
  | 'delivered'
  | 'partial'
  | 'extra'
  | 'failed'
  | 'skipped'
  | 'missed';

export interface DeliveryBoardItem {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantLabel?: string | null;
  unit?: string | null;
  quantity: number; // scheduled quantity
  deliveredQuantity: number; // actual delivered quantity
  unitPrice?: number;
  itemStatus: DeliveryBoardStatus;
  failureReason?: string | null;
  failureNotes?: string | null;
  deliveryId?: string | null;
  deliverySlot?: 'morning' | 'evening' | null;
}

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
  deliveryId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  productName?: string | null;
  deliveryStatus: DeliveryBoardStatus | string;
  quantity: number;
  scheduledQuantity?: number;
  actualQuantity?: number | null;
  volumeInLiters?: number;
  unit?: string | null;
  pricePerPacket?: number | null;
  items?: DeliveryBoardItem[]; // per-item detail for drawer
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
  status: 'delivered' | 'partial' | 'extra' | 'failed' | 'skipped' | 'missed';
  actualQuantity?: number;
  reason?: string;
  notes?: string;
  deliveryDate?: string;
}

/** Session availability returned by /api/deliveries/admin/session-state */
export interface DeliverySessionState {
  date: string;
  isToday: boolean;
  morningOpen: boolean;
  eveningOpen: boolean;
  eveningOpensAt: string;
}

/** Per-item outcome payload for the details drawer */
export interface DeliveryItemOutcome {
  productId: string;
  variantId?: string | null;
  productName: string;
  variantLabel?: string | null;
  unit?: string | null;
  quantity: number;
  unitPrice: number;
  deliveredQuantity: number;
  itemStatus: DeliveryBoardStatus;
  failureReason?: string | null;
  failureNotes?: string | null;
}

/** A pending prior-day delivery returned by /api/deliveries/admin/unconfirmed */
export interface UnconfirmedDelivery {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone?: string | null;
  deliveryDate: string;
  deliverySlot: 'morning' | 'evening';
  status: DeliveryBoardStatus;
  scheduledQuantity: number;
  pricePerPacket?: number | null;
  referenceType: 'subscription' | 'order';
  referenceId: string;
}

/** Group of unconfirmed deliveries by date for bulk confirmation */
export interface UnconfirmedGroup {
  date: string;
  deliveries: UnconfirmedDelivery[];
  count: number;
  total: number;
}
