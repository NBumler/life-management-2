package hu.bumler.lm2.gear;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Subfeatures/Pakolás.md — a GearItem reference inside a PackingSession, with a packing status. */
@Entity
@Table(name = "packing_session_item")
public class PackingSessionItemEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "session_id", nullable = false)
	private UUID sessionId;

	@Column(name = "gear_item_id", nullable = false)
	private UUID gearItemId;

	@Column(nullable = false)
	private String status = "NOT_PACKED";

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

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

	protected PackingSessionItemEntity() {
	}

	public PackingSessionItemEntity(UUID id, UUID userId, UUID sessionId, UUID gearItemId, String status, int sortOrder) {
		this.id = id;
		this.userId = userId;
		this.sessionId = sessionId;
		this.gearItemId = gearItemId;
		this.status = status;
		this.sortOrder = sortOrder;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getSessionId() {
		return sessionId;
	}

	public UUID getGearItemId() {
		return gearItemId;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
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
