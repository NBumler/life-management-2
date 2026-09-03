package hu.bumler.lm2.common;

import java.time.OffsetDateTime;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * documentation/Architektúra/Backend.md §"Idempotencia": the {@code idempotency_key} table is
 * tracked "for 30 days" — this is the job that enforces that window. Rows exist only to replay the
 * stored response of an atomic endpoint (today only {@code POST /api/shopping-lists/{id}/complete})
 * when the native drain retries the same outbox item; once the client has long since moved on, the
 * row is dead weight.
 *
 * <p>Plain CRUD endpoints need no row here at all — they are naturally idempotent (client-supplied
 * UUID upsert, idempotent soft delete), so there is nothing to prune for them.
 */
@Component
class IdempotencyKeyPruneJob {

	private static final Logger log = LoggerFactory.getLogger(IdempotencyKeyPruneJob.class);

	/** documentation/Architektúra/Backend.md §"Idempotencia" — "30 napig" tracked. */
	static final int RETENTION_DAYS = 30;

	private final IdempotencyKeyRepository repository;

	IdempotencyKeyPruneJob(IdempotencyKeyRepository repository) {
		this.repository = repository;
	}

	/** Daily at 03:15 server time. Overridable (or disable-able with {@code -}) via config for tests / ops. */
	@Scheduled(cron = "${lm2.idempotency.prune.cron:0 15 3 * * *}")
	void scheduledPrune() {
		prune();
	}

	/** @return the number of rows deleted. */
	@Transactional
	int prune() {
		OffsetDateTime cutoff = OffsetDateTime.now().minusDays(RETENTION_DAYS);
		int deleted = repository.deleteByCreatedAtBefore(cutoff);
		log.info("Idempotency-Key prune: removed {} row(s) created before {}.", deleted, cutoff);
		return deleted;
	}
}
