import "dotenv/config";
import { getBoss, QUEUES } from "./src/queue/boss";
import { handleDispatchCampaign } from "./src/queue/jobs/dispatch-campaign";
import { handleSendMessage } from "./src/queue/jobs/send-message";
import { handleIngestWebhook } from "./src/queue/jobs/ingest-webhook";
import { handleMockDeliverStep, type MockDeliverStepPayload } from "./src/queue/jobs/mock-deliver";
import { log } from "./src/lib/logger";

async function main(): Promise<void> {
  const boss = await getBoss();

  await boss.work(QUEUES.dispatchCampaign, { batchSize: 2 }, async (jobs) => {
    for (const job of jobs) {
      const data = job.data as { campaignId: string };
      await handleDispatchCampaign(data);
    }
  });

  await boss.work(QUEUES.sendMessage, { batchSize: 8 }, async (jobs) => {
    await Promise.all(
      jobs.map((job) => handleSendMessage(job.data as { outboundMessageId: string }))
    );
  });

  await boss.work(QUEUES.ingestWebhook, { batchSize: 4 }, async (jobs) => {
    for (const job of jobs) {
      await handleIngestWebhook(job.data as { webhookReceiptId: string });
    }
  });

  await boss.work(QUEUES.mockDeliver, { batchSize: 4 }, async (jobs) => {
    for (const job of jobs) {
      await handleMockDeliverStep(job.data as MockDeliverStepPayload);
    }
  });

  log.info("worker.ready", { queues: Object.values(QUEUES) });
}

main().catch((err) => {
  log.error("worker.fatal", { err: err instanceof Error ? err.stack : String(err) });
  process.exit(1);
});
