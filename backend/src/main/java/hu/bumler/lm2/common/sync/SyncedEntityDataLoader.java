package hu.bumler.lm2.common.sync;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;

/**
 * Registered by each feature for its synced entity type(s), so the generic {@code sync} package
 * never needs to know about individual features (documentation/Architektúra/Backend.md "Sync
 * végpontok megvalósítása": "a data payload nem a view-ból jön: típusonként batch-load, majd
 * ugyanaz a mapper, mint a CRUD GET-nél").
 */
public interface SyncedEntityDataLoader {

	/** Must match the `entity_type` literal used for this table in the `sync_changes` view. */
	String entityType();

	/** @return the DTOs for the given ids, as GET-by-id would return them, keyed by id. Missing ids are simply absent. */
	Map<UUID, Object> loadByIds(Collection<UUID> ids);
}
