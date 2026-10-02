import { prisma } from '../index';
import { emitEvent } from './socket';

const serviceNames: Record<string, string> = {
  cash_withdrawal: "Cash Withdrawal",
  cash_deposit: "Cash Deposit",
  check_deposits: "Cheque Deposits",
  fund_transfers: "Fund Transfers",
  bill_payments: "Bill Payments",
  balance: "Balance Inquiry",
  statement_generation: "Statement Generation",
  account_updates: "Account Updates",
  pin_reset: "PIN / Password Reset",
  fraud_reporting: "Fraud Reporting",
  mfa_setup: "Multi-Factor Setup",
};

// --- Office Service ---

export const createOffice = async (officeData: any) => {
  const { name, deskNumber, office, branch_id, services, occupiedBy } = officeData;

  const existing = await prisma.office.findFirst({
    where: { name, branch_id: branch_id || 'MAIN' },
  });

  if (existing) {
    const error: any = new Error(`Office station "${name}" already exists in branch "${branch_id || 'MAIN'}"`);
    error.statusCode = 400;
    throw error;
  }

  let finalServices = services ? services : [];
  if (occupiedBy) {
    try {
      const fetchedServices = await getTellerActivities(occupiedBy);
      if (fetchedServices && fetchedServices.length > 0) {
        finalServices = fetchedServices;
      }
    } catch (e) {
      console.error(`[CREATE_OFFICE] Failed fetching teller activities for '${occupiedBy}':`, e);
    }
  }

  const newOffice = await prisma.office.create({
    data: {
      name,
      deskNumber: deskNumber || '',
      office: office || '',
      status: occupiedBy ? 'AVAILABLE' : 'OFFLINE',
      occupiedBy: occupiedBy || null,
      branch_id: branch_id || 'MAIN',
      services: finalServices,
    },
  });

  emitEvent('office:updated', newOffice, newOffice.branch_id);
  return newOffice;
};

export function filterServiceLabels(services: any[]): string[] {
  if (!Array.isArray(services)) return [];
  const rawStrings = services.map((s) => String(s).trim()).filter(Boolean);
  
  // Check if we have descriptive labels (strings with spaces or > 5 chars)
  const hasDescriptiveLabels = rawStrings.some((s) => s.includes(' ') || s.length > 5);

  const cleanList: string[] = [];

  for (const s of rawStrings) {
    const isShortCode = /^[A-Z0-9]{2,5}$/.test(s);
    
    // Omit short uppercase codes (e.g. EMW, CADD, CAWW, CCQ) whenever descriptive labels are present
    if (isShortCode && hasDescriptiveLabels) {
      continue;
    }
    
    cleanList.push(s);
  }

  return Array.from(new Set(cleanList));
}

export const getOffices = async (branch_id?: string) => {
  const offices = branch_id
    ? await prisma.office.findMany({ where: { branch_id }, orderBy: { id: 'asc' } })
    : await prisma.office.findMany({ orderBy: { id: 'asc' } });

  return offices.map((o) => ({
    ...o,
    services: filterServiceLabels(Array.isArray(o.services) ? o.services : []),
  }));
};

import { getTellerActivities } from './tellerActivityService';

export const updateOfficeStatus = async (id: number, status: any, occupiedBy?: string | null) => {
  const data: any = { status };
  if (status === 'OFFLINE') {
    data.occupiedBy = null;
  } else if (occupiedBy !== undefined) {
    data.occupiedBy = occupiedBy;
  }

  // When teller logs in (becomes active with occupiedBy username), fetch their services dynamically
  if (status !== 'OFFLINE' && occupiedBy) {
    try {
      const fetchedServices = await getTellerActivities(occupiedBy);
      if (fetchedServices && fetchedServices.length > 0) {
        data.services = fetchedServices;
        console.log(`[OFFICE_STATUS] Assigned dynamic services to office ${id} for teller '${occupiedBy}':`, fetchedServices);
      } else {
        console.log(`[OFFICE_STATUS] API returned no services or failed for '${occupiedBy}'. Keeping existing office services as fallback.`);
      }
    } catch (e) {
      console.error(`[OFFICE_STATUS] Error fetching teller activities for '${occupiedBy}':`, e);
    }
  }

  const office = await prisma.office.update({
    where: { id },
    data,
  });
  emitEvent('office:updated', office, office.branch_id);
  return office;
};

export const updateOffice = async (id: number, data: any) => {
  const { name, deskNumber } = data;
  const office = await prisma.office.update({
    where: { id },
    data: { name, deskNumber },
  });
  emitEvent('office:updated', office, office.branch_id);
  return office;
};

export const deleteOffice = async (id: number) => {
  const office = await prisma.office.delete({ where: { id } });
  emitEvent('office:updated', { id, deleted: true }, office.branch_id);
  return office;
};

export const updateOfficeServices = async (id: number, services: any) => {
  const office = await prisma.office.update({
    where: { id },
    data: { services: services || [] },
  });
  emitEvent('office:updated', office, office.branch_id);
  return office;
};

// --- Ticket Service ---

export const createTicket = async (ticketData: any) => {
  let {
    ticketId,
    queueNumber,
    serviceId,
    amount,
    customerName,
    accountNumber,
    transactionId,
    branch_id,
  } = ticketData;

  if (!queueNumber) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxRes: any[] = await prisma.$queryRaw`SELECT MAX("queueNumber") as max FROM "Ticket" WHERE "timestamp" >= ${today}`;
    queueNumber = (Number(maxRes?.[0]?.max) || 0) + 1;
  }

  const serviceName = serviceNames[serviceId] || serviceId;

  if (!ticketId) {
    ticketId = `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  }

  const ticket = await prisma.ticket.create({
    data: {
      ticketId,
      queueNumber: parseInt(queueNumber),
      serviceId,
      serviceName,
      amount: amount ? Number(amount) : null,
      customerName: customerName || '',
      accountNumber: accountNumber || '',
      transactionId: transactionId || '',
      status: 'PENDING',
      branch_id: branch_id || 'MAIN',
    },
  });

  emitEvent('ticket:created', ticket, ticket.branch_id);
  return ticket;
};

export const getAllTickets = async (branchId?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return prisma.ticket.findMany({ 
    where: { 
      timestamp: { gte: today },
      branch_id: branchId ? branchId : undefined
    }, 
    orderBy: { timestamp: 'desc' } 
  });
};

export const getWaitingTickets = async (branchId?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.ticket.findMany({ 
    where: { 
      status: 'PENDING', 
      timestamp: { gte: today },
      branch_id: branchId ? branchId : undefined
    }, 
    orderBy: { timestamp: 'asc' } 
  });
};

export const getSkippedTickets = async (branchId?: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return prisma.ticket.findMany({ 
    where: { 
      status: 'SKIPPED', 
      timestamp: { gte: today },
      branch_id: branchId ? branchId : undefined
    }, 
    orderBy: { timestamp: 'asc' } 
  });
};

export const updateTicketStatus = async (id: number, status: any, officeId: string | null = null, isPostedToCore?: boolean) => {
  let data: any = { status };
  const now = new Date();

  if (status === 'CALLING') {
    data.assignedOfficeId = officeId?.toString();
    data.calledAt = now;
  } else if (status === 'SERVING') {
    data.servedAt = now.toISOString();
  } else if (status === 'COMPLETED') {
    data.completedAt = now.toISOString();
  }
  
  if (isPostedToCore !== undefined) {
    data.isPostedToCore = isPostedToCore;
  }

  const ticket = await prisma.ticket.update({
    where: { id },
    data,
  });

  if (ticket && status === 'CALLING') {
    emitEvent('ticket:called', ticket, ticket.branch_id);
  }

  emitEvent('ticket:updated', ticket, ticket.branch_id);
  return ticket;
};
