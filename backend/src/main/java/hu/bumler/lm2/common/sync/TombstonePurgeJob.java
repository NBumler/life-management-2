package hu.bumler.lm2.common.sync;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Housekeeping half of the offline sync contract: physically removes tombstones (soft-deleted rows)
 * once they are older than the retention horizon, and advances {@code sync_meta.tombstone_horizon} so
 * {@code GET /api/sync/changes} keeps rejecting cursors that predate it with {@code 410
 * CURSOR_TOO_OLD} ({@link SyncService#pull}).
 *
 * <p>documentation/Architektúra/Backend-offline first.md §"Tombstone-retenció": "legalább 180 nap a
 * deleted_at-tól; ennél régebbi tombstone fizikailag is törölhető." Retention is exactly
 * {@value #RETENTION_DAYS} days here.
 *
 * <p>The set of tables to sweep is discovered from the live schema (every {@code BASE TABLE} with a
 * {@code deleted_at} column) instead of being hardcoded, mirroring {@code
 * SyncChangesViewCompletenessTest} — a future synced table is picked up automatically. Foreign keys
 * between synced tables are not {@code ON DELETE CASCADE}, so the deletes run in repeated passes: a
 * row that cannot be removed yet because a not-yet-swept child still references it is retried on the
 * next pass. A cascade soft-delete tombstones parent and children in the same transaction, so their
 * {@code deleted_at} values cross the horizon together and the passes always converge.
 *
 * <p>Deliberately not {@code @Transactional}: each {@code DELETE} autocommits on its own connection,
 * so a foreign-key failure on one table is caught in isolation without poisoning the sibling deletes.
 */
@Component
class TombstonePurgeJob {

	private static final Logger log = LoggerFactory.getLogger(TombstonePurgeJob.class);

	/** documentation/Architektúra/Backend-offline first.md §"Tombstone-retenció" — the "legalább 180 nap". */
	static final int RETENTION_DAYS = 180;

	/** Table names come from the Postgres catalog, not from user input; this is a defence-in-depth guard. */
	private static final Pattern SAFE_TABLE_NAME = Pattern.compile("[a-z_]+");

	private final JdbcTemplate jdbcTemplate;

	TombstonePurgeJob(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/** Daily at 03:30 server time. Overridable (or disable-able with {@code -}) via config for tests / ops. */
	@Scheduled(cron = "${lm2.sync.tombstone-purge.cron:0 30 3 * * *}")
	void scheduledPurge() {
		purgeExpiredTombstones();
	}

	/** @return the number of rows physically deleted. */
	int purgeExpiredTombstones() {
		OffsetDateTime horizon = advanceHorizon();
		Timestamp cutoff = Timestamp.from(horizon.toInstant());

		List<String> tables = discoverTombstoneTables();
		List<String> remaining = new ArrayList<>(tables);
		Map<String, Integer> deletedByTable = new LinkedHashMap<>();
		int totalDeleted = 0;

		for (int pass = 0; pass < tables.size() && !remaining.isEmpty(); pass++) {
			boolean progressed = false;
			Iterator<String> it = remaining.iterator();
			while (it.hasNext()) {
				String table = it.next();
				try {
					int deleted = jdbcTemplate.update(
							"DELETE FROM " + table + " WHERE deleted = true AND deleted_at < ?", cutoff);
					if (deleted > 0) {
						deletedByTable.merge(table, deleted, Integer::sum);
						totalDeleted += deleted;
					}
					it.remove();
					progressed = true;
				} catch (DataAccessException retryOnNextPass) {
					// A not-yet-swept child row still references this one; retry once the child is gone.
				}
			}
			if (!progressed) {
				break;
			}
		}

		if (remaining.isEmpty()) {
			log.info("Tombstone purge: removed {} row(s) with deleted_at before {} {}.",
					totalDeleted, horizon, deletedByTable);
		} else {
			log.warn("Tombstone purge: removed {} row(s) with deleted_at before {} {}, but {} table(s) could not be "
					+ "drained on any pass (foreign-key order): {}", totalDeleted, horizon, deletedByTable,
					remaining.size(), remaining);
		}
		return totalDeleted;
	}

	private OffsetDateTime advanceHorizon() {
		// Monotonic: never move the horizon backwards, even if a clock skew or a manual override would.
		jdbcTemplate.update(
				"UPDATE sync_meta SET tombstone_horizon = GREATEST(tombstone_horizon, now() - (? * interval '1 day'))",
				RETENTION_DAYS);
		return jdbcTemplate.queryForObject("SELECT tombstone_horizon FROM sync_meta", OffsetDateTime.class);
	}

	private List<String> discoverTombstoneTables() {
		List<String> tables = jdbcTemplate.queryForList("""
				SELECT table_name FROM information_schema.columns
				WHERE table_schema = 'public' AND column_name = 'deleted_at'
				AND table_name IN (
				    SELECT table_name FROM information_schema.tables
				    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
				)
				ORDER BY table_name
				""", String.class);
		for (String table : tables) {
			if (!SAFE_TABLE_NAME.matcher(table).matches()) {
				throw new IllegalStateException("Unexpected table name from catalog: " + table);
			}
		}
		return tables;
	}
}
