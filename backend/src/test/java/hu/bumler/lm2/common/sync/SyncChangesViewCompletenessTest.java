package hu.bumler.lm2.common.sync;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

import hu.bumler.lm2.TestcontainersConfiguration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * documentation/Architektúra/Backend.md "Kötelező teszt: minden `deleted` oszlopos tábla szerepel
 * a view-ban. ... ez az egyetlen hely, ahol egy elfelejtett tábla csendben kiesne a syncből."
 *
 * <p>This test discovers both sides from the live schema instead of hardcoding either list, so it
 * actually catches the failure mode the doc warns about: a future migration that adds a new
 * synced table (one with a {@code deleted} column) but forgets to add it to the
 * {@code sync_changes} view's {@code UNION ALL}. A hardcoded expected-table list would pass right
 * through that mistake since nobody would remember to update the test alongside the migration.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SyncChangesViewCompletenessTest {

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void everyTableWithADeletedColumn_isReferencedBySyncChangesView() {
		List<String> tablesWithDeletedColumn = jdbcTemplate.queryForList("""
				SELECT table_name FROM information_schema.columns
				WHERE table_schema = 'public' AND column_name = 'deleted'
				AND table_name IN (
				    SELECT table_name FROM information_schema.tables
				    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
				)
				ORDER BY table_name
				""", String.class);

		// Sanity check on the discovery query itself: if this is empty, the test below would
		// trivially "pass" without checking anything.
		assertThat(tablesWithDeletedColumn).isNotEmpty();

		List<String> tablesReferencedByView = jdbcTemplate.queryForList("""
				SELECT DISTINCT table_name FROM information_schema.view_table_usage
				WHERE view_schema = 'public' AND view_name = 'sync_changes'
				ORDER BY table_name
				""", String.class);

		assertThat(tablesReferencedByView).as(
				"sync_changes view must UNION ALL every table with a 'deleted' column, or that table's "
						+ "changes silently never reach the delta pull")
				.containsExactlyInAnyOrderElementsOf(tablesWithDeletedColumn);
	}
}
