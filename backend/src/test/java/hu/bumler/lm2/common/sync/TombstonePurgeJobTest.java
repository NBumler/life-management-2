package hu.bumler.lm2.common.sync;

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
 * documentation/Architektúra/Backend-offline first.md §"Tombstone-retenció" +
 * backlog/056 — the scheduled cleanup / horizon-advance job.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class TombstonePurgeJobTest {

	@Autowired
	private TombstonePurgeJob job;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void advancesTombstoneHorizonToTheRetentionWindow() {
		job.purgeExpiredTombstones();

		OffsetDateTime horizon = jdbcTemplate.queryForObject(
				"SELECT tombstone_horizon FROM sync_meta", OffsetDateTime.class);
		OffsetDateTime now = OffsetDateTime.now();

		// A day-wide window: the exact instant drifts by the DST offset between "now" and 180 days
		// ago (Postgres keeps the wall-clock time-of-day across the shift), which is expected — the
		// point is that the horizon tracks ~180 days back instead of staying at the migration seed.
		assertThat(horizon)
				.isAfter(now.minusDays(TombstonePurgeJob.RETENTION_DAYS + 1))
				.isBefore(now.minusDays(TombstonePurgeJob.RETENTION_DAYS - 1));
	}

	@Test
	void deletesExpiredTombstonesButKeepsRecentTombstonesAndLiveRows() {
		UUID expired = insertFood("purge-expired", true, OffsetDateTime.now().minusDays(200));
		UUID recentlyDeleted = insertFood("purge-recent", true, OffsetDateTime.now().minusDays(10));
		UUID live = insertFood("purge-live", false, null);

		job.purgeExpiredTombstones();

		assertThat(rowExists("food", expired)).as("tombstone older than the horizon is physically gone").isFalse();
		assertThat(rowExists("food", recentlyDeleted)).as("tombstone within the retention window is kept").isTrue();
		assertThat(rowExists("food", live)).as("live row is untouched").isTrue();
	}

	@Test
	void drainsChildRowsBeforeParents_despiteNonCascadingForeignKeys() {
		Timestamp longAgo = Timestamp.from(OffsetDateTime.now().minusDays(200).toInstant());
		UUID foodId = insertFood("purge-fk-food", true, OffsetDateTime.now().minusDays(200));
		UUID recipeId = UUID.randomUUID();
		jdbcTemplate.update(
				"INSERT INTO recipe (id, name, name_normalized, deleted, deleted_at) VALUES (?, ?, ?, true, ?)",
				recipeId, "purge-fk-recipe", "purge-fk-recipe", longAgo);
		UUID ingredientId = UUID.randomUUID();
		jdbcTemplate.update("""
				INSERT INTO recipe_ingredient
				    (id, recipe_id, food_id, quantity_amount, quantity_unit, sort_order, deleted, deleted_at)
				VALUES (?, ?, ?, 100, 'g', 0, true, ?)
				""", ingredientId, recipeId, foodId, longAgo);

		int deleted = job.purgeExpiredTombstones();

		assertThat(deleted).isGreaterThanOrEqualTo(3);
		assertThat(rowExists("recipe_ingredient", ingredientId)).isFalse();
		assertThat(rowExists("recipe", recipeId)).isFalse();
		assertThat(rowExists("food", foodId)).isFalse();
	}

	@Test
	void isIdempotent_soASecondRunDeletesNothing() {
		insertFood("purge-idem", true, OffsetDateTime.now().minusDays(200));
		job.purgeExpiredTombstones();

		assertThat(job.purgeExpiredTombstones()).isZero();
	}

	private UUID insertFood(String name, boolean deleted, OffsetDateTime deletedAt) {
		UUID id = UUID.randomUUID();
		jdbcTemplate.update(
				"INSERT INTO food (id, name, name_normalized, deleted, deleted_at) VALUES (?, ?, ?, ?, ?)",
				id, name, name, deleted, deletedAt == null ? null : Timestamp.from(deletedAt.toInstant()));
		return id;
	}

	private boolean rowExists(String table, UUID id) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM " + table + " WHERE id = ?", Integer.class, id);
		return count != null && count > 0;
	}
}
