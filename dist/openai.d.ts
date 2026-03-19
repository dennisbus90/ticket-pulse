export interface AIAnalysisResult {
    score: number;
    missingEdgeCases: string[];
    unclearParts: string[];
    suggestions: string[];
}
interface TicketData {
    summary: string;
    descriptionText: string;
    acceptanceCriteria: string;
}
export declare function analyzeWithAI(ticket: TicketData, apiKey: string): Promise<AIAnalysisResult | null>;
export {};
