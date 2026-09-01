import { v4 as uuidv4 } from "uuid";
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import logger from "../../utils/logger";
import Config from "../../config";

// Same client-init pattern as ./jobs.ts (no shared DynamoDB client module
// exists yet in this codebase -- see batchReports.ts/jobs.ts, which each
// set this up independently too).
const dynamoDbConfig: any = {
  region: Config.AWS_REGION || "us-east-1",
};

if (Config.dynamoDbEndpoint) {
  dynamoDbConfig.endpoint = Config.dynamoDbEndpoint;
  dynamoDbConfig.credentials = {
    accessKeyId: "DUMMYIDEXAMPLE",
    secretAccessKey: "DUMMYEXAMPLEKEY",
  };
} else if (Config.AWS_ACCESS_KEY_ID && Config.AWS_SECRET_ACCESS_KEY) {
  dynamoDbConfig.credentials = {
    accessKeyId: Config.AWS_ACCESS_KEY_ID,
    secretAccessKey: Config.AWS_SECRET_ACCESS_KEY,
  };
}

const docClient = DynamoDBDocument.from(new DynamoDB(dynamoDbConfig));

const JOB_QUEUE_TABLE = "Delphi_JobQueue";
const ACTIVE_STATUSES = new Set(["PENDING", "PROCESSING"]);

function isMathJobQueueEnabled(): boolean {
  // Opt-in: existing deployments that rely on delphi's own continuous
  // Poller (polismath/poller.py) shouldn't suddenly start double-processing
  // every vote through this path too. Enable once a deployment has moved
  // delphi to on-demand/Fargate-style execution.
  return process.env.DELPHI_JOB_QUEUE_ENABLED === "true";
}

/**
 * Enqueue a math recompute job for a conversation, matching the same
 * Delphi_JobQueue item shape as handle_POST_delphi_jobs (./jobs.ts).
 * Debounced: skips enqueueing if a job for this conversation is already
 * PENDING or PROCESSING, since that job will pick up these votes too.
 * Never throws -- a queue failure must not affect the voting response;
 * this is a best-effort trigger, not the vote's critical path.
 */
export async function enqueueMathJobForConversation(
  zid: number | string
): Promise<void> {
  if (!isMathJobQueueEnabled()) {
    return;
  }

  const conversationId = String(zid);

  try {
    const existing = await docClient.query({
      TableName: JOB_QUEUE_TABLE,
      IndexName: "ConversationIndex",
      KeyConditionExpression: "conversation_id = :zid",
      ExpressionAttributeValues: { ":zid": conversationId },
      ScanIndexForward: false,
      Limit: 1,
    });

    const latestJob = existing.Items?.[0];
    if (latestJob && ACTIVE_STATUSES.has(latestJob.status)) {
      return;
    }

    const now = new Date().toISOString();
    const jobId = uuidv4();

    await docClient.put({
      TableName: JOB_QUEUE_TABLE,
      Item: {
        job_id: jobId,
        status: "PENDING",
        created_at: now,
        updated_at: now,
        version: 1,
        started_at: "",
        completed_at: "",
        worker_id: "none",
        job_type: "FULL_PIPELINE",
        priority: 50,
        conversation_id: conversationId,
        retry_count: 0,
        max_retries: 3,
        timeout_seconds: 14400,
        job_config: JSON.stringify({
          stages: [
            { stage: "PCA", config: {} },
            { stage: "UMAP", config: { n_neighbors: 15, min_dist: 0.1 } },
            {
              stage: "REPORT",
              config: {
                model: process.env.ANTHROPIC_MODEL || "claude-3-7-sonnet-20250219",
                include_topics: true,
              },
            },
          ],
          visualizations: ["basic", "enhanced", "multilayer"],
        }),
        job_results: JSON.stringify({}),
        logs: JSON.stringify({
          entries: [
            {
              timestamp: now,
              level: "INFO",
              message: `Job auto-enqueued after a vote in conversation ${conversationId}`,
            },
          ],
          log_location: "",
        }),
        created_by: "vote-trigger",
      },
    });

    logger.info(
      `Enqueued math job ${jobId} for conversation ${conversationId}`
    );
  } catch (err) {
    logger.error(
      `Error enqueueing math job for conversation ${conversationId}:`,
      err
    );
  }
}
