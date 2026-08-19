package hu.bumler.lm2.common.sync;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import hu.bumler.lm2.api.model.SyncChangeItem;
import hu.bumler.lm2.api.model.SyncChangesResponse;
import hu.bumler.lm2.common.exception.CursorTooOldException;

@Service
public class SyncService {

	private final SyncChangesRepository syncChangesRepository;
	private final JdbcTemplate jdbcTemplate;
	private final Map<String, SyncedEntityDataLoader> loadersByEntityType;

	SyncService(SyncChangesRepository syncChangesRepository, JdbcTemplate jdbcTemplate,
			List<SyncedEntityDataLoader> loaders) {
		this.syncChangesRepository = syncChangesRepository;
		this.jdbcTemplate = jdbcTemplate;
		this.loadersByEntityType = loaders.stream()
				.collect(Collectors.toMap(SyncedEntityDataLoader::entityType, loader -> loader));
	}

	public SyncChangesResponse pull(UUID userId, String sinceCursor, int limit, List<String> types) {
		SyncCursor.Position since = sinceCursor == null ? null : SyncCursor.decode(sinceCursor);
		if (since != null && since.updatedAt().isBefore(tombstoneHorizon())) {
			throw new CursorTooOldException("since predates the tombstone retention horizon");
		}

		List<SyncChangeRow> rows = syncChangesRepository.page(userId, since, types, limit + 1);
		boolean hasMore = rows.size() > limit;
		List<SyncChangeRow> page = hasMore ? rows.subList(0, limit) : rows;

		Map<UUID, Object> dataById = loadData(page);
		List<SyncChangeItem> changes = new ArrayList<>(page.size());
		for (SyncChangeRow row : page) {
			SyncChangeItem item = new SyncChangeItem(row.entityType(), row.id(), row.deleted(), row.updatedAt());
			if (!row.deleted()) {
				item.data(dataById.get(row.id()));
			}
			changes.add(item);
		}

		String nextCursor = page.isEmpty()
				? sinceCursor
				: SyncCursor.encode(page.get(page.size() - 1).updatedAt(), page.get(page.size() - 1).id());

		return new SyncChangesResponse(OffsetDateTime.now(), nextCursor, hasMore, changes);
	}

	private Map<UUID, Object> loadData(List<SyncChangeRow> page) {
		Map<String, List<UUID>> idsByType = new HashMap<>();
		for (SyncChangeRow row : page) {
			if (!row.deleted()) {
				idsByType.computeIfAbsent(row.entityType(), k -> new ArrayList<>()).add(row.id());
			}
		}
		Map<UUID, Object> result = new HashMap<>();
		idsByType.forEach((entityType, ids) -> {
			SyncedEntityDataLoader loader = loadersByEntityType.get(entityType);
			if (loader != null) {
				result.putAll(loader.loadByIds(ids));
			}
		});
		return result;
	}

	private OffsetDateTime tombstoneHorizon() {
		return jdbcTemplate.queryForObject("SELECT tombstone_horizon FROM sync_meta", OffsetDateTime.class);
	}
}
