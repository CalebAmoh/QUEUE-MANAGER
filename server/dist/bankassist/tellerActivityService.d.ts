/**
 * Safely extracts service IDs from the raw teller activities API response data array.
 */
export declare function extractServiceIds(data: any[]): string[];
/**
 * Fetches services assigned to a teller by username with up to maxRetries attempts.
 * Returns string[] of service IDs if successful, or null if empty/failed (triggering fallback).
 */
export declare function getTellerActivities(username: string, maxRetries?: number): Promise<string[] | null>;
//# sourceMappingURL=tellerActivityService.d.ts.map