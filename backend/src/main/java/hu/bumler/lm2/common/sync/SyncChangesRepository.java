package hu.bumler.lm2.common.sync;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** Reads the `sync_changes` SQL view (documentation/Architektúra/Backend.md) — not a JPA entity, it's a UNION ALL view. */
@Repository
class SyncChangesRepository {

	private final JdbcTemplate jdbcTemplate;

	SyncChangesRepository(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	/** @param limit the caller should request pageSize + 1 to detect hasMore. */
	List<SyncChangeRow> page(UUID userId, SyncCursor.Position since, List<String> types, int limit) {
		StringBuilder sql = new StringBuilder(
				"SELECT entity_type, id, updated_at, deleted FROM sync_changes WHERE (user_id = ? OR user_id IS NULL)");
		List<Object> params = new ArrayList<>();
		params.add(userId);

		if (since != null) {
			sql.append(" AND (updated_at, id) > (?, ?)");
			params.add(Timestamp.from(since.updatedAt().toInstant()));
			params.add(since.id());
		}
		if (types != null && !types.isEmpty()) {
			sql.append(" AND entity_type IN (")
					.append(String.join(",", Collections.nCopies(types.size(), "?")))
					.append(")");
			params.addAll(types);
		}
		sql.append(" ORDER BY updated_at, id LIMIT ?");
		params.add(limit);

		return jdbcTemplate.query(sql.toString(),
				(rs, rowNum) -> new SyncChangeRow(
						rs.getString("entity_type"),
						UUID.fromString(rs.getString("id")),
						rs.getObject("updated_at", OffsetDateTime.class),
						rs.getBoolean("deleted")),
				params.toArray());
	}
}
