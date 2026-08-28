package hu.bumler.lm2.common;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Architektúra/Backend.md "Idempotencia" — shared replay-protection infrastructure for
 * every atomic (non-upsert) mutating endpoint. The first consumer is
 * {@code POST /api/shopping-lists/{id}/complete} (documentation/Subfeatures/Bevásárlás teljesítve.md),
 * but this lives in {@code hu.bumler.lm2.common} — not a feature package — because the mechanism is
 * cross-cutting: any future atomic endpoint reuses it. The table itself was created by
 * {@code V1__common_infrastructure.sql}. {@code key} is the client-supplied {@code Idempotency-Key}
 * header value (the outbox item's own id) and doubles as the primary key; {@code userId} and
 * {@code endpoint} are matched on lookup as well (defence-in-depth against a key value being reused
 * across tenants or endpoints) and drive the eventual 30-day pruning job.
 */
@Entity
@Table(name = "idempotency_key")
public class IdempotencyKeyEntity {

	@Id
	private UUID key;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String endpoint;

	@Column(name = "http_status", nullable = false)
	private int httpStatus;

	/** Pre-serialized JSON (via the same Jackson `ObjectMapper` the generated models use) — stored/read as raw text, not mapped to a bespoke Java response type. */
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "response_body", nullable = false)
	private String responseBody;

	@Generated(event = EventType.INSERT)
	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	protected IdempotencyKeyEntity() {
	}

	public IdempotencyKeyEntity(UUID key, UUID userId, String endpoint, int httpStatus, String responseBody) {
		this.key = key;
		this.userId = userId;
		this.endpoint = endpoint;
		this.httpStatus = httpStatus;
		this.responseBody = responseBody;
	}

	public UUID getKey() {
		return key;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getEndpoint() {
		return endpoint;
	}

	public int getHttpStatus() {
		return httpStatus;
	}

	public String getResponseBody() {
		return responseBody;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}
}
