package hu.bumler.lm2.common.sync;

import java.time.OffsetDateTime;
import java.util.UUID;

record SyncChangeRow(String entityType, UUID id, OffsetDateTime updatedAt, boolean deleted) {
}
