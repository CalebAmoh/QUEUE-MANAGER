"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractServiceIds = extractServiceIds;
exports.getTellerActivities = getTellerActivities;
const axios_1 = __importDefault(require("axios"));
const TELLER_ACTIVITIES_URL = process.env.TELLER_ACTIVITIES_URL ||
    'http://10.203.14.33:8182/autoAPIGenerator/plx/api/gen/bb13652c-add1-4e72-9e62-497a85fd8ce4/api/v1.0/teller-activities';
const API_KEY = process.env.TELLER_API_KEY || 'testPC';
const API_SECRET = process.env.TELLER_API_SECRET || 'test_PC';
/**
 * Safely extracts service IDs from the raw teller activities API response data array.
 */
function extractServiceIds(data) {
    if (!Array.isArray(data))
        return [];
    const services = [];
    for (const item of data) {
        if (typeof item === 'string' && item.trim()) {
            services.push(item.trim());
        }
        else if (typeof item === 'object' && item !== null) {
            // Prioritize human-readable label/name
            const label = (typeof item.LABEL === 'string' && item.LABEL.trim()) ||
                (typeof item.label === 'string' && item.label.trim()) ||
                (typeof item.serviceName === 'string' && item.serviceName.trim()) ||
                (typeof item.service_name === 'string' && item.service_name.trim()) ||
                (typeof item.title === 'string' && item.title.trim()) ||
                (typeof item.name === 'string' && item.name.trim()) ||
                (typeof item.FORM_CODE === 'string' && item.FORM_CODE.trim()) ||
                (typeof item.form_code === 'string' && item.form_code.trim()) ||
                (typeof item.activityCode === 'string' && item.activityCode.trim()) ||
                (typeof item.serviceId === 'string' && item.serviceId.trim());
            if (label) {
                services.push(label);
            }
        }
    }
    return Array.from(new Set(services));
}
/**
 * Fetches services assigned to a teller by username with up to maxRetries attempts.
 * Returns string[] of service IDs if successful, or null if empty/failed (triggering fallback).
 */
async function getTellerActivities(username, maxRetries = 2) {
    if (!username)
        return null;
    const url = `${TELLER_ACTIVITIES_URL}/${encodeURIComponent(username)}`;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
        try {
            console.log(`[TELLER_ACTIVITIES] Attempt ${attempt} fetching for teller '${username}' from ${url}...`);
            const response = await axios_1.default.get(url, {
                headers: {
                    'x-api-key': API_KEY,
                    'x-api-secret': API_SECRET,
                },
                timeout: 5000,
            });
            if (response.data && response.data.success && Array.isArray(response.data.data)) {
                const services = extractServiceIds(response.data.data);
                console.log(`[TELLER_ACTIVITIES] Retrieved ${services.length} services for '${username}':`, services);
                return services;
            }
        }
        catch (error) {
            console.error(`[TELLER_ACTIVITIES] Attempt ${attempt} failed for '${username}':`, error.message);
            if (attempt <= maxRetries) {
                // Wait 500ms before retrying
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }
    }
    console.warn(`[TELLER_ACTIVITIES] Failed or empty services for '${username}'. Fallback will be applied.`);
    return null;
}
//# sourceMappingURL=tellerActivityService.js.map