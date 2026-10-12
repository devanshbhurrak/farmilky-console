export interface AgentInfo {
  joiningDate?: string | null;
  vehicleType?: string | null;
  maxCapacity?: number | null;
  assignedArea?: string | { id: string; name: string } | null;
}

export interface Agent {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  isActive: boolean;
  agentInfo?: AgentInfo | null;
  assignedAreaName?: string | null;
  createdAt: string;
}

export interface AgentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}
