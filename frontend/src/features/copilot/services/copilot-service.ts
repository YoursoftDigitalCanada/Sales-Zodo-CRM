import api from "@/lib/axios";

export interface CopilotContext {
    module: string;
    entityId?: string | null;
    page?: string;
}

export interface CopilotResponse {
    answer: string;
    suggestedActions?: string[];
    suggestedFollowUps?: string[];
}

export async function askCopilot(
    message: string,
    context: CopilotContext
): Promise<CopilotResponse> {
    const response = await api.post("/copilot/ask", { message, context });
    return response.data?.data || response.data;
}
