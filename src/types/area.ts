export interface Area {
  id: string;
  name: string;
  pincodes?: string[];
  localities?: string[];
  assignedAgent?: string | { id: string; name: string } | null;
  assignedAgentName?: string | null;
  sequence?: number;
  isActive?: boolean;
  customerCount?: number;
  createdAt?: string;
}

export interface AreaCustomer {
  customerId: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  sequence: number;
}
