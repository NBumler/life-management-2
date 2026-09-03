package hu.bumler.lm2.common;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import hu.bumler.lm2.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * documentation/Architektúra/Backend.md §"Idempotencia" + backlog/058 — the 30-day prune job for the
 * {@code idempotency_key} table.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class IdempotencyKeyPruneJobTest {

	@Autowired
	private IdempotencyKeyPruneJob job;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void deletesRowsPastTheRetentionWindowButKeepsRecentOnes() {
		UUID expired = insertKey(OffsetDateTime.now().minusDays(IdempotencyKeyPruneJob.RETENTION_DAYS + 1));
		UUID recent = insertKey(OffsetDateTime.now().minusDays(IdempotencyKeyPruneJob.RETENTION_DAYS - 1));

		int deleted = job.prune();

		assertThat(deleted).isGreaterThanOrEqualTo(1);
		assertThat(keyExists(expired)).as("row older than 30 days is pruned").isFalse();
		assertThat(keyExists(recent)).as("row within the 30-day window is kept").isTrue();
	}

	@Test
	void isIdempotent_soASecondRunDeletesNothing() {
		insertKey(OffsetDateTime.now().minusDays(IdempotencyKeyPruneJob.RETENTION_DAYS + 5));
		job.prune();

		assertThat(job.prune()).isZero();
	}

	/**
	 * The production path is {@code @Scheduled scheduledPrune()}, which reaches the {@code @Modifying}
	 * bulk delete via a plain {@code this.prune()} self-invocation. Exercising it here (rather than
	 * {@code prune()} directly) proves the transaction is actually established on that path — without
	 * {@code @Transactional} on {@code scheduledPrune()} this throws {@code TransactionRequiredException}.
	 */
	@Test
	void scheduledPrune_runsInATransaction_andDeletesExpiredRows() {
		UUID expired = insertKey(OffsetDateTime.now().minusDays(IdempotencyKeyPruneJob.RETENTION_DAYS + 1));
		UUID recent = insertKey(OffsetDateTime.now().minusDays(IdempotencyKeyPruneJob.RETENTION_DAYS - 1));

		job.scheduledPrune();

		assertThat(keyExists(expired)).as("row older than 30 days is pruned on the scheduled path").isFalse();
		assertThat(keyExists(recent)).as("row within the 30-day window is kept").isTrue();
	}

	private UUID insertKey(OffsetDateTime createdAt) {
		UUID key = UUID.randomUUID();
		jdbcTemplate.update("""
				INSERT INTO idempotency_key (key, user_id, endpoint, http_status, response_body, created_at)
				VALUES (?, ?, ?, ?, ?::jsonb, ?)
				""", key, UUID.randomUUID(), "/api/shopping-lists/{id}/complete", 200, "{}",
				Timestamp.from(createdAt.toInstant()));
		return key;
	}

	private boolean keyExists(UUID key) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM idempotency_key WHERE key = ?", Integer.class, key);
		return count != null && count > 0;
	}
}
