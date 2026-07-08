export type KnowledgeReindexResult = {
  bakerId: number;
  chunksIndexed: number;
  embeddingProvider: "openai" | "local";
  message: string;
};

export async function reindexBakerKnowledge(bakerId: number): Promise<KnowledgeReindexResult> {
  const response = await fetch(`/api/bakers/${bakerId}/knowledge/reindex`, { method: "POST" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Failed to reindex knowledge");
  }
  return response.json() as Promise<KnowledgeReindexResult>;
}
