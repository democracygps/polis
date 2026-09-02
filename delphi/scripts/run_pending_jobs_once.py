#!/usr/bin/env python3
"""
One-shot job runner for on-demand compute (e.g. an AWS Fargate task launched
per job): drains whatever this instance size can currently claim from
Delphi_JobQueue, then exits -- unlike job_poller.py's poll_and_process, which
loops forever on a fixed interval, this expects to be invoked by an external
dispatcher (one task launch per enqueued job) and should not idle-poll.

Reuses JobProcessor as-is (find_pending_job/get_job_actual_size/claim_job/
process_job) -- same claim/process logic as the continuous poller, just
without the sleep-and-retry loop around it.
"""

import argparse
import logging
import sys

from job_poller import JobProcessor, logger


def drain_pending_jobs(processor: JobProcessor) -> int:
    """Process every job this instance size can claim, then return the count."""
    processed = 0

    while True:
        job_to_process = processor.find_pending_job()
        if not job_to_process:
            break

        conversation_id_str = job_to_process.get("conversation_id")
        job_actual_size = (
            processor.get_job_actual_size(conversation_id_str)
            if conversation_id_str
            else "normal"
        )

        instance_type = processor.instance_type
        if instance_type == "large":
            can_process = job_actual_size == "large"
        elif instance_type == "dev":
            can_process = True
        else:
            can_process = job_actual_size == "normal"

        if not can_process:
            # This instance size can't handle the highest-priority job right
            # now. Unlike the continuous poller (which sleeps and rechecks),
            # a one-shot task has nothing else to wait for -- exit and let
            # the dispatcher route a differently-sized task at this job.
            logger.info(
                f"Worker instance type '{instance_type}' cannot process job "
                f"'{job_to_process['job_id']}' of size '{job_actual_size}'. "
                "Exiting without processing."
            )
            break

        claimed_job = processor.claim_job(job_to_process)
        if not claimed_job:
            # Another worker claimed it first between find and claim; move on.
            continue

        processor.process_job(claimed_job)
        processed += 1

    return processed


def main():
    parser = argparse.ArgumentParser(
        description="Drain currently-pending Delphi_JobQueue jobs once, then exit"
    )
    parser.add_argument("--endpoint-url", type=str, default=None)
    parser.add_argument("--region", type=str, default="us-east-1")
    parser.add_argument(
        "--log-level",
        type=str,
        default="INFO",
        choices=["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"],
    )
    args = parser.parse_args()

    logger.setLevel(getattr(logging, args.log_level))

    processor = JobProcessor(endpoint_url=args.endpoint_url, region=args.region)
    processed = drain_pending_jobs(processor)
    logger.info(f"Processed {processed} job(s). Exiting.")
    sys.exit(0)


if __name__ == "__main__":
    main()
