export interface BranchInfo {
    actualCode: string;
    subCode: string | null;
    description: string;
}
/**
 * Fetches all branches live from the Core Banking API.
 * Only caches successful, non-empty responses from the Core Banking system.
 */
export declare function getBranchList(): Promise<BranchInfo[]>;
/**
 * Finds branch description by code (e.g. '004' -> 'SINKOR', 'MAIN' -> 'MAIN BRANCH')
 */
export declare function getBranchDescription(code: string): Promise<string>;
//# sourceMappingURL=branchService.d.ts.map