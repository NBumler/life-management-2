package hu.bumler.lm2.gear;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.generator.EventType;
import org.hibernate.type.SqlTypes;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Subfeatures/Pakolás.md — an active packing session, without its items. */
@Entity
@Table(name = "packing_session")
public class PackingSessionEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column
	private String destination;

	// documentation/Architektúra/Backend.md: native Postgres uuid[] via Hibernate's SqlTypes.ARRAY —
	// no extra dependency needed for a plain list of ids (unlike jsonb, which would need its own
	// serialization concern for no benefit here).
	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "source_template_ids", nullable = false)
	private List<UUID> sourceTemplateIds = new ArrayList<>();

	@Generated(event = EventType.INSERT)
	@Column(name = "created_at", insertable = false, updatable = false)
	private OffsetDateTime createdAt;

	@Generated(event = { EventType.INSERT, EventType.UPDATE })
	@Column(name = "updated_at", insertable = false, updatable = false)
	private OffsetDateTime updatedAt;

	@Column(nullable = false)
	private boolean deleted = false;

	@Column(name = "deleted_at")
	private OffsetDateTime deletedAt;

	protected PackingSessionEntity() {
	}

	public PackingSessionEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getDestination() {
		return destination;
	}

	public void setDestination(String destination) {
		this.destination = destination;
	}

	public List<UUID> getSourceTemplateIds() {
		return sourceTemplateIds;
	}

	public void setSourceTemplateIds(List<UUID> sourceTemplateIds) {
		this.sourceTemplateIds = sourceTemplateIds;
	}

	public OffsetDateTime getCreatedAt() {
		return createdAt;
	}

	public OffsetDateTime getUpdatedAt() {
		return updatedAt;
	}

	public boolean isDeleted() {
		return deleted;
	}

	public OffsetDateTime getDeletedAt() {
		return deletedAt;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
