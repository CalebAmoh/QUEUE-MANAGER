export type TicketStatus = 'PENDING' | 'CALLING' | 'SERVING' | 'COMPLETED' | 'SKIPPED' | 'CANCELLED';
export type OfficeStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE' | 'SERVING';

export interface Ticket {
  id: number;
  ticketId: string;
  queueNumber: number;
  serviceId: string;
  serviceName: string;
  amount: number | null;
  customerName: string;
  accountNumber: string;
  transactionId: string;
  timestamp: string;
  status: TicketStatus;
  assignedOfficeId: number | null;
  calledAt: string | null;
  servedAt: string | null;
  completedAt: string | null;
  branch_id?: string;
  isPostedToCore: boolean;
}

export interface Office {
  id: number;
  name: string;
  deskNumber: string;
  status: OfficeStatus;
  branch_id?: string;
  services: string[];
  occupiedBy: string | null;
}

export interface Ad {
  id: number;
  title: string;
  url: string;
  type: 'image' | 'video';
  active: boolean;
  display_type: 'landscape' | 'portrait';
  created_at: string;
}
