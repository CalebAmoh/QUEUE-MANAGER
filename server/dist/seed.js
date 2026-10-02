"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const adapter = new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new client_1.PrismaClient({ adapter });
const selfServices = [
    {
        serviceId: 'cash_withdrawal',
        title: 'Cash Withdrawal',
        description: 'Link to the cashier for fast GHC cash withdrawal.',
        tag: 'Cash',
        enabled: true,
        displayOrder: 1,
    },
    {
        serviceId: 'cash_deposit',
        title: 'Cash Deposit',
        description: 'Deposit cash directly into your account instantly.',
        tag: 'Cash',
        enabled: true,
        displayOrder: 2,
    },
    {
        serviceId: 'check_deposits',
        title: 'Cheque Deposits',
        description: 'Capture cheque images with OCR for instant posting.',
        tag: 'Deposits',
        enabled: true,
        displayOrder: 3,
    },
    {
        serviceId: 'fund_transfers',
        title: 'Fund Transfers',
        description: 'Transfer funds intra-bank, via GhIPSS, or to mobile money wallets.',
        tag: 'Transfers',
        enabled: true,
        displayOrder: 4,
    },
    {
        serviceId: 'bill_payments',
        title: 'Bill Payments',
        description: 'Pay utilities, mobile top-ups, TV subscriptions, school fees, and more.',
        tag: 'Payments',
        enabled: true,
        displayOrder: 5,
    },
    {
        serviceId: 'balance',
        title: 'Balance Inquiry',
        description: 'Check balance with detailed mini-statement including recent transactions.',
        tag: 'Insights',
        enabled: true,
        displayOrder: 6,
    },
    {
        serviceId: 'statement_generation',
        title: 'Statement Generation',
        description: 'Select a date range to view, download PDF, or email statements.',
        tag: 'Documentation',
        enabled: true,
        displayOrder: 7,
    },
    {
        serviceId: 'account_updates',
        title: 'Account Updates',
        description: 'Update contact info such as phone number, email, or address.',
        tag: 'Maintenance',
        enabled: false,
        displayOrder: 8,
    },
    {
        serviceId: 'fraud_reporting',
        title: 'Fraud Reporting',
        description: 'Report suspicious activity or lost items with instant block.',
        tag: 'Security',
        enabled: true,
        displayOrder: 9,
    },
    {
        serviceId: 'pin_reset',
        title: 'PIN / Password Reset',
        description: 'Self-service reset for online banking credentials.',
        tag: 'Security',
        enabled: false,
        displayOrder: 10,
    },
    {
        serviceId: 'mfa_setup',
        title: 'Multi-Factor Setup',
        description: 'Enroll additional biometrics or trusted devices.',
        tag: 'Security',
        enabled: false,
        displayOrder: 11,
    },
];
const assistedServices = [
    {
        serviceId: 'cash_withdrawal',
        title: 'Cash Withdrawal',
        description: 'Assisted cash withdrawal from your account',
        tag: 'Cash',
        enabled: true,
        displayOrder: 1,
    },
    {
        serviceId: 'cash_deposit',
        title: 'Cash Deposit',
        description: 'Deposit cash into your account',
        tag: 'Cash',
        enabled: true,
        displayOrder: 2,
    },
    {
        serviceId: 'check_deposits',
        title: 'Cheque Deposits',
        description: 'Deposit cheques with Teller assistance',
        tag: 'Deposits',
        enabled: true,
        displayOrder: 3,
    },
    {
        serviceId: 'fund_transfers',
        title: 'Fund Transfers',
        description: 'Transfer funds with assistance',
        tag: 'Transfers',
        enabled: true,
        displayOrder: 4,
    },
    {
        serviceId: 'bill_payments',
        title: 'Bill Payments',
        description: 'Pay bills with Teller help',
        tag: 'Payments',
        enabled: true,
        displayOrder: 5,
    },
    {
        serviceId: 'balance',
        title: 'Balance Inquiry',
        description: 'Check your account balance',
        tag: 'Insights',
        enabled: true,
        displayOrder: 6,
    },
    {
        serviceId: 'statement_generation',
        title: 'Statement Generation',
        description: 'Get account statements',
        tag: 'Documentation',
        enabled: true,
        displayOrder: 7,
    },
    {
        serviceId: 'account_updates',
        title: 'Account Updates',
        description: 'Update your account details',
        tag: 'Maintenance',
        enabled: true,
        displayOrder: 8,
    },
    {
        serviceId: 'fraud_reporting',
        title: 'Fraud Reporting',
        description: 'Report suspicious activity',
        tag: 'Security',
        enabled: true,
        displayOrder: 9,
    },
    {
        serviceId: 'pin_reset',
        title: 'PIN / Password Reset',
        description: 'Reset your credentials with assistance',
        tag: 'Security',
        enabled: false,
        displayOrder: 10,
    },
    {
        serviceId: 'mfa_setup',
        title: 'Multi-Factor Setup',
        description: 'Setup additional security with assistance',
        tag: 'Security',
        enabled: false,
        displayOrder: 11,
    },
];
// ── Audit log seed data ──
const auditLogLevels = ['info', 'warning', 'error', 'critical'];
const auditLogCategories = ['auth', 'transaction', 'system', 'security', 'api', 'user'];
const auditActions = [
    'User login attempt',
    'Fingerprint scan initiated',
    'Cash withdrawal processed',
    'Cash deposit completed',
    'Balance inquiry',
    'Fund transfer executed',
    'Bill payment processed',
    'Statement generated',
    'PIN reset requested',
    'Check deposit submitted',
    'Account update processed',
    'MFA setup completed',
    'Fraud report filed',
    'Service configuration updated',
    'Security alert triggered',
    'API rate limit exceeded',
    'Database backup completed',
    'User session expired',
    'Failed authentication',
    'Transaction rolled back',
];
const trafficEndpoints = [
    '/api/auth/login',
    '/api/auth/logout',
    '/api/cash-withdrawal',
    '/api/cash-deposit',
    '/api/balance-inquiry',
    '/api/fund-transfers',
    '/api/bill-payments',
    '/api/check-deposits',
    '/api/account-updates',
    '/api/statement-generation',
    '/api/pin-reset',
    '/api/fraud-reporting',
    '/api/mfa-setup',
    '/api/fingerprint/verify',
    '/api/transactions',
    '/api/user/profile',
    '/api/services/status',
    '/api/admin/logs',
];
const trafficMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const serviceIds = [
    'fingerprint_auth', 'balance_inquiry', 'account_updates', 'statement_generation',
    'fund_transfers', 'bill_payments', 'cash_withdrawal', 'cash_deposit',
    'check_deposits', 'pin_reset', 'fraud_reporting', 'mfa_setup', 'assistance', 'receipt',
];
const serviceNamesMap = {
    fingerprint_auth: 'Fingerprint Authentication',
    balance_inquiry: 'Balance Inquiry',
    account_updates: 'Account Updates',
    statement_generation: 'Statement Generation',
    fund_transfers: 'Fund Transfers',
    bill_payments: 'Bill Payments',
    cash_withdrawal: 'Cash Withdrawal',
    cash_deposit: 'Cash Deposit',
    check_deposits: 'Check Deposits',
    pin_reset: 'PIN Reset',
    fraud_reporting: 'Fraud Reporting',
    mfa_setup: 'MFA Setup',
    assistance: 'CRO Assistance',
    receipt: 'Receipt Generation',
};
const serviceActions = [
    'Service health check',
    'Process request',
    'Validate input',
    'Database query',
    'External API call',
    'Cache lookup',
    'Error recovery',
    'Backup operation',
];
function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
async function main() {
    console.log('🌱 Seeding database...');
    // Upsert self-services
    for (const service of selfServices) {
        await prisma.selfService.upsert({
            where: { serviceId: service.serviceId },
            update: service,
            create: service,
        });
    }
    console.log(`✅ Seeded ${selfServices.length} self-services`);
    // Upsert assisted services
    for (const service of assistedServices) {
        await prisma.assistedService.upsert({
            where: { serviceId: service.serviceId },
            update: service,
            create: service,
        });
    }
    console.log(`✅ Seeded ${assistedServices.length} assisted services`);
    // Seed audit logs (200 entries over the past 7 days)
    await prisma.auditLog.deleteMany();
    const auditLogs = Array.from({ length: 200 }, (_, i) => {
        const level = pick(auditLogLevels);
        return {
            timestamp: new Date(Date.now() - i * 1000 * 60 * 50), // ~every 50 min
            level,
            category: pick(auditLogCategories),
            userId: `user_${Math.floor(Math.random() * 50)}`,
            userName: `User ${Math.floor(Math.random() * 50)}`,
            action: pick(auditActions),
            details: `Detailed log entry for action performed by system user`,
            ipAddress: `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            status: level === 'error' || level === 'critical' ? (Math.random() > 0.5 ? 'failure' : 'success') : (Math.random() > 0.15 ? 'success' : 'failure'),
            metadata: { source: pick(['web', 'kiosk', 'mobile']), version: '1.0.0' },
        };
    });
    await prisma.auditLog.createMany({ data: auditLogs });
    console.log(`✅ Seeded ${auditLogs.length} audit logs`);
    // Seed traffic entries (300 entries over the past 24 hours)
    await prisma.trafficEntry.deleteMany();
    const trafficEntries = Array.from({ length: 300 }, (_, i) => {
        const statusCode = Math.random() > 0.9 ? (Math.random() > 0.5 ? 500 : 404) : Math.random() > 0.3 ? 200 : 400;
        return {
            timestamp: new Date(Date.now() - i * 1000 * 60 * 5), // ~every 5 min
            method: pick(trafficMethods),
            endpoint: pick(trafficEndpoints),
            statusCode,
            responseTime: Math.floor(Math.random() * 900) + 50,
            ipAddress: `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            userId: `user_${Math.floor(Math.random() * 50)}`,
            requestSize: Math.floor(Math.random() * 10000),
            responseSize: Math.floor(Math.random() * 50000),
            errorMessage: statusCode >= 400 ? 'Error processing request' : null,
        };
    });
    await prisma.trafficEntry.createMany({ data: trafficEntries });
    console.log(`✅ Seeded ${trafficEntries.length} traffic entries`);
    // Seed service activity logs (250 entries over the past 48 hours)
    await prisma.serviceActivityLog.deleteMany();
    const activityLogs = Array.from({ length: 250 }, (_, i) => {
        const svcId = pick(serviceIds);
        const status = Math.random() > 0.85 ? 'failure' : Math.random() > 0.92 ? 'pending' : 'success';
        return {
            serviceId: svcId,
            serviceName: serviceNamesMap[svcId],
            timestamp: new Date(Date.now() - i * 1000 * 60 * 12), // ~every 12 min
            action: pick(serviceActions),
            status,
            duration: Math.floor(Math.random() * 2000) + 50,
            errorMessage: status === 'failure' ? 'Service timeout or error' : null,
            userId: `user_${Math.floor(Math.random() * 50)}`,
            metadata: { requestId: Math.random().toString(36).substring(2, 15) },
        };
    });
    await prisma.serviceActivityLog.createMany({ data: activityLogs });
    console.log(`✅ Seeded ${activityLogs.length} service activity logs`);
    console.log('🎉 Seeding complete!');
}
main()
    .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map