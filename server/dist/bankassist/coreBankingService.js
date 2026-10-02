"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postTicketToCore = postTicketToCore;
exports.updateTicketInCore = updateTicketInCore;
require("dotenv/config");
const index_1 = require("../index");
const CORE_INSERT_URL = process.env.CORE_INSERT_URL ||
    "http://10.203.14.33:8182/autoAPIGenerator/plx/api/gen/5b9f0ea8-2d64-459e-9f41-a7a4cc1f787a/api/v1";
const CORE_UPDATE_URL = process.env.CORE_UPDATE_URL ||
    "http://10.203.14.33:8182/autoAPIGenerator/plx/api/gen/3fcf6fd2-6629-456d-a8ef-90ad9bc8079f/api/v1";
function getCoreAuthHeader() {
    // Use .env credentials if available, otherwise fallback to known working hardcoded ones
    const username = process.env.CORE_SOAP_USERNAME || '20171411891';
    const password = process.env.CORE_SOAP_PASSWORD || '141116517P';
    return 'Basic ' + Buffer.from(`${username}:${password}`).toString('base64');
}
function buildInsertXml(ticket, servedBy) {
    const postingDate = new Date().toISOString().split('T')[0];
    const servedAt = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">
  <soap:Header></soap:Header>
  <soap:Body>
    <INSERT xmlns="http://tempuri.org/">
        <ticket_id>${ticket.ticket_id || ticket.ticketId}</ticket_id>
        <cr_account>${ticket.cr_account || ticket.accountNumber || ""}</cr_account>
        <dr_account>${ticket.dr_account || ""}</dr_account>
        <trans_type>${ticket.trans_type || ticket.serviceId || ""}</trans_type>
        <amount>${ticket.amount || 0}</amount>
        <currency>${ticket.currency || "GHS"}</currency>
        <doc_ref>${ticket.doc_ref || ticket.transactionId || ""}</doc_ref>
        <is_served>N</is_served>
        <served_by>${servedBy}</served_by>
        <posting_date>${postingDate}</posting_date>
        <served_at>${servedAt}</served_at>
        <param1>${ticket.param1 || ticket.customerName || ""}</param1>
        <param2>${ticket.param2 || ""}</param2>
        <param3>${ticket.param3 || ""}</param3>
        <param4>${ticket.param4 || ""}</param4>
        <param5>${ticket.param5 || ""}</param5>
      </INSERT>
  </soap:Body>
</soap:Envelope>`;
}
function buildUpdateXml(ticket, isServed, servedBy) {
    const postingDate = new Date().toISOString().split('T')[0];
    const servedAt = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:soapenc="http://schemas.xmlsoap.org/soap/encoding/">
  <soap:Header></soap:Header>
  <soap:Body>
    <UPDATE xmlns="http://tempuri.org/">
        <ticket_id>${ticket.ticket_id || ticket.ticketId}</ticket_id>
        <cr_account>${ticket.cr_account || ticket.accountNumber || ""}</cr_account>
        <dr_account>${ticket.dr_account || ""}</dr_account>
        <trans_type>${ticket.trans_type || ticket.serviceId || ""}</trans_type>
        <amount>${ticket.amount || 0}</amount>
        <currency>${ticket.currency || "GHS"}</currency>
        <doc_ref>${ticket.doc_ref || ticket.transactionId || ""}</doc_ref>
        <is_served>${isServed}</is_served>
        <served_by>${servedBy}</served_by>
        <posting_date>${postingDate}</posting_date>
        <served_at>${servedAt}</served_at>
        <param1>${ticket.param1 || ticket.customerName || ""}</param1>
        <param2>${ticket.param2 || ""}</param2>
        <param3>${ticket.param3 || ""}</param3>
        <param4>${ticket.param4 || ""}</param4>
        <param5>${ticket.param5 || ""}</param5>
      </UPDATE>
  </soap:Body>
</soap:Envelope>`;
}
async function postTicketToCore(ticket, servedBy) {
    // Fetch latest data from tb_self_serv_txn using ticketId as link
    try {
        const txns = await index_1.prisma.$queryRaw `SELECT * FROM tb_self_serv_txn WHERE ticket_id = ${ticket.ticketId} LIMIT 1`;
        if (txns && txns.length > 0) {
            console.log(`[CORE_BANKING] Data matched from tb_self_serv_txn for ${ticket.ticketId}`);
            // Use the logged transaction data as the primary source
            ticket = { ...ticket, ...txns[0] };
        }
    }
    catch (err) {
        console.warn(`[CORE_BANKING] Could not fetch intermediary log for ${ticket.ticketId}, falling back to Ticket data.`);
    }
    const xmlPayload = buildInsertXml(ticket, servedBy);
    const authHeader = getCoreAuthHeader();
    console.log(`[CORE_BANKING_v2] Attempting POST to ${CORE_INSERT_URL}`);
    console.log(`[CORE_BANKING] Payload:`, xmlPayload);
    try {
        const response = await fetch(CORE_INSERT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Authorization': authHeader
            },
            body: xmlPayload,
        });
        console.log(`[CORE_BANKING] Response Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[CORE_BANKING] Error Response Body:`, errText);
            throw new Error(`CORE INSERT API Error: ${response.status} ${errText}`);
        }
        const responseText = await response.text();
        console.log(`[CORE_BANKING] Success Response Body:`, responseText);
        // Note: is_served remains 'N' in PostgreSQL after initial call
        // It will be updated to 'Y' only when updateTicketInCore is called on completion.
        return responseText;
    }
    catch (error) {
        console.error("[CORE_BANKING] Failed to POST ticket to core:", error.message);
        throw error;
    }
}
async function updateTicketInCore(ticket, isServed, servedBy) {
    // Fetch latest data from tb_self_serv_txn using ticketId as link
    try {
        const txns = await index_1.prisma.$queryRaw `SELECT * FROM tb_self_serv_txn WHERE ticket_id = ${ticket.ticketId} LIMIT 1`;
        if (txns && txns.length > 0) {
            ticket = { ...ticket, ...txns[0] };
        }
    }
    catch (err) {
        // fallback to ticket
    }
    const xmlPayload = buildUpdateXml(ticket, isServed, servedBy);
    const authHeader = getCoreAuthHeader();
    console.log(`[CORE_BANKING_v2] Attempting UPDATE to ${CORE_UPDATE_URL}`);
    try {
        const response = await fetch(CORE_UPDATE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/xml; charset=utf-8',
                'Authorization': authHeader
            },
            body: xmlPayload,
        });
        console.log(`[CORE_BANKING] Response Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const errText = await response.text();
            console.error(`[CORE_BANKING] Error Response Body:`, errText);
            throw new Error(`CORE UPDATE API Error: ${response.status} ${errText}`);
        }
        const responseText = await response.text();
        console.log(`[CORE_BANKING] Success Response Body:`, responseText);
        // Sync back to PostgreSQL tb_self_serv_txn
        try {
            // isServed is 'Y', 'C' (Cancelled), or 'N'
            const statusValue = isServed === 'Y' || isServed === 'C' ? isServed : 'N';
            await index_1.prisma.$executeRaw `UPDATE tb_self_serv_txn SET is_served = ${statusValue} WHERE ticket_id = ${ticket.ticketId || ticket.ticket_id}`;
            console.log(`[CORE_BANKING] Log status updated to '${statusValue}' for ${ticket.ticketId || ticket.ticket_id}`);
        }
        catch (err) {
            console.error(`[CORE_BANKING] Failed to sync status back to log:`, err);
        }
        return responseText;
    }
    catch (error) {
        console.error("[CORE_BANKING] Failed to UPDATE ticket in core:", error.message);
        throw error;
    }
}
//# sourceMappingURL=coreBankingService.js.map