"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.getSkippedTickets = exports.getWaitingTickets = exports.getAllTickets = exports.createTicket = exports.updateOfficeServices = exports.deleteOffice = exports.updateOffice = exports.updateOfficeStatus = exports.getOffices = exports.createOffice = void 0;
exports.filterServiceLabels = filterServiceLabels;
const index_1 = require("../index");
const socket_1 = require("./socket");
const serviceNames = {
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
const createOffice = async (officeData) => {
    const { name, deskNumber, office, branch_id, services, occupiedBy } = officeData;
    const existing = await index_1.prisma.office.findFirst({
        where: { name, branch_id: branch_id || 'MAIN' },
    });
    if (existing) {
        const error = new Error(`Office station "${name}" already exists in branch "${branch_id || 'MAIN'}"`);
        error.statusCode = 400;
        throw error;
    }
    let finalServices = services ? services : [];
    if (occupiedBy) {
        try {
            const fetchedServices = await (0, tellerActivityService_1.getTellerActivities)(occupiedBy);
            if (fetchedServices && fetchedServices.length > 0) {
                finalServices = fetchedServices;
            }
        }
        catch (e) {
            console.error(`[CREATE_OFFICE] Failed fetching teller activities for '${occupiedBy}':`, e);
        }
    }
    const newOffice = await index_1.prisma.office.create({
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
    (0, socket_1.emitEvent)('office:updated', newOffice, newOffice.branch_id);
    return newOffice;
};
exports.createOffice = createOffice;
function filterServiceLabels(services) {
    if (!Array.isArray(services))
        return [];
    const rawStrings = services.map((s) => String(s).trim()).filter(Boolean);
    // Check if we have descriptive labels (strings with spaces or > 5 chars)
    const hasDescriptiveLabels = rawStrings.some((s) => s.includes(' ') || s.length > 5);
    const cleanList = [];
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
const getOffices = async (branch_id) => {
    const offices = branch_id
        ? await index_1.prisma.office.findMany({ where: { branch_id }, orderBy: { id: 'asc' } })
        : await index_1.prisma.office.findMany({ orderBy: { id: 'asc' } });
    return offices.map((o) => ({
        ...o,
        services: filterServiceLabels(Array.isArray(o.services) ? o.services : []),
    }));
};
exports.getOffices = getOffices;
const tellerActivityService_1 = require("./tellerActivityService");
const updateOfficeStatus = async (id, status, occupiedBy) => {
    const data = { status };
    if (status === 'OFFLINE') {
        data.occupiedBy = null;
    }
    else if (occupiedBy !== undefined) {
        data.occupiedBy = occupiedBy;
    }
    // When teller logs in (becomes active with occupiedBy username), fetch their services dynamically
    if (status !== 'OFFLINE' && occupiedBy) {
        try {
            const fetchedServices = await (0, tellerActivityService_1.getTellerActivities)(occupiedBy);
            if (fetchedServices && fetchedServices.length > 0) {
                data.services = fetchedServices;
                console.log(`[OFFICE_STATUS] Assigned dynamic services to office ${id} for teller '${occupiedBy}':`, fetchedServices);
            }
            else {
                console.log(`[OFFICE_STATUS] API returned no services or failed for '${occupiedBy}'. Keeping existing office services as fallback.`);
            }
        }
        catch (e) {
            console.error(`[OFFICE_STATUS] Error fetching teller activities for '${occupiedBy}':`, e);
        }
    }
    const office = await index_1.prisma.office.update({
        where: { id },
        data,
    });
    (0, socket_1.emitEvent)('office:updated', office, office.branch_id);
    return office;
};
exports.updateOfficeStatus = updateOfficeStatus;
const updateOffice = async (id, data) => {
    const { name, deskNumber } = data;
    const office = await index_1.prisma.office.update({
        where: { id },
        data: { name, deskNumber },
    });
    (0, socket_1.emitEvent)('office:updated', office, office.branch_id);
    return office;
};
exports.updateOffice = updateOffice;
const deleteOffice = async (id) => {
    const office = await index_1.prisma.office.delete({ where: { id } });
    (0, socket_1.emitEvent)('office:updated', { id, deleted: true }, office.branch_id);
    return office;
};
exports.deleteOffice = deleteOffice;
const updateOfficeServices = async (id, services) => {
    const office = await index_1.prisma.office.update({
        where: { id },
        data: { services: services || [] },
    });
    (0, socket_1.emitEvent)('office:updated', office, office.branch_id);
    return office;
};
exports.updateOfficeServices = updateOfficeServices;
// --- Ticket Service ---
const createTicket = async (ticketData) => {
    let { ticketId, queueNumber, serviceId, amount, customerName, accountNumber, transactionId, branch_id, } = ticketData;
    if (!queueNumber) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const maxRes = await index_1.prisma.$queryRaw `SELECT MAX("queueNumber") as max FROM "Ticket" WHERE "timestamp" >= ${today}`;
        queueNumber = (Number(maxRes?.[0]?.max) || 0) + 1;
    }
    const serviceName = serviceNames[serviceId] || serviceId;
    if (!ticketId) {
        ticketId = `T-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    }
    const ticket = await index_1.prisma.ticket.create({
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
    (0, socket_1.emitEvent)('ticket:created', ticket, ticket.branch_id);
    return ticket;
};
exports.createTicket = createTicket;
const getAllTickets = async (branchId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return index_1.prisma.ticket.findMany({
        where: {
            timestamp: { gte: today },
            branch_id: branchId ? branchId : undefined
        },
        orderBy: { timestamp: 'desc' }
    });
};
exports.getAllTickets = getAllTickets;
const getWaitingTickets = async (branchId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return index_1.prisma.ticket.findMany({
        where: {
            status: 'PENDING',
            timestamp: { gte: today },
            branch_id: branchId ? branchId : undefined
        },
        orderBy: { timestamp: 'asc' }
    });
};
exports.getWaitingTickets = getWaitingTickets;
const getSkippedTickets = async (branchId) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return index_1.prisma.ticket.findMany({
        where: {
            status: 'SKIPPED',
            timestamp: { gte: today },
            branch_id: branchId ? branchId : undefined
        },
        orderBy: { timestamp: 'asc' }
    });
};
exports.getSkippedTickets = getSkippedTickets;
const updateTicketStatus = async (id, status, officeId = null, isPostedToCore) => {
    let data = { status };
    const now = new Date();
    if (status === 'CALLING') {
        data.assignedOfficeId = officeId?.toString();
        data.calledAt = now;
    }
    else if (status === 'SERVING') {
        data.servedAt = now.toISOString();
    }
    else if (status === 'COMPLETED') {
        data.completedAt = now.toISOString();
    }
    if (isPostedToCore !== undefined) {
        data.isPostedToCore = isPostedToCore;
    }
    const ticket = await index_1.prisma.ticket.update({
        where: { id },
        data,
    });
    if (ticket && status === 'CALLING') {
        (0, socket_1.emitEvent)('ticket:called', ticket, ticket.branch_id);
    }
    (0, socket_1.emitEvent)('ticket:updated', ticket, ticket.branch_id);
    return ticket;
};
exports.updateTicketStatus = updateTicketStatus;
//# sourceMappingURL=ticketService.js.map