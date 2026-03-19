export declare const handler: (payload: {
    call: {
        functionKey: string;
        payload?: unknown;
        jobId?: string | undefined;
    };
    context: import("@forge/resolver/out/shared").Context;
}, backendRuntimePayload?: Record<string, any> | undefined) => Promise<unknown>;
