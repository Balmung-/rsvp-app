import PgBoss from "pg-boss";

let bossInstance: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

export async function getBoss(): Promise<PgBoss> {
  if (bossInstance) return bossInstance;
  if (starting) return starting;

  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is required for pg-boss.");

  starting = (async () => {
    const boss = new PgBoss({
      connectionString: url,
      schema: "pgboss",
      retryLimit: 5,
      retryBackoff: true,
      retryDelay: 30,
      archiveCompletedAfterSeconds: 60 * 60 * 24 * 7,
      deleteAfterDays: 14,
    });
    boss.on("error", (err) => {
      console.error("[pg-boss] error", err);
    });
    await boss.start();
    bossInstance = boss;
    return boss;
  })();

  return starting;
}

export const QUEUES = {
  dispatchCampaign: "dispatch-campaign",
  sendMessage: "send-message",
  ingestWebhook: "ingest-webhook",
  mockDeliver: "mock-deliver",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
