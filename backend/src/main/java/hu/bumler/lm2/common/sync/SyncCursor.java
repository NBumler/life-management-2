package hu.bumler.lm2.common.sync;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.UUID;

/** Opaque base64(instant + "_" + id) — never a raw timestamp (documentation/Architektúra/Backend-offline first.md §8). */
final class SyncCursor {

	record Position(OffsetDateTime updatedAt, UUID id) {
	}

	private SyncCursor() {
	}

	static String encode(OffsetDateTime updatedAt, UUID id) {
		String raw = updatedAt.toInstant() + "_" + id;
		return Base64.getUrlEncoder().withoutPadding().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
	}

	static Position decode(String cursor) {
		String raw = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
		int separator = raw.lastIndexOf('_');
		Instant instant = Instant.parse(raw.substring(0, separator));
		UUID id = UUID.fromString(raw.substring(separator + 1));
		return new Position(instant.atOffset(ZoneOffset.UTC), id);
	}
}
