package hu.bumler.lm2.food;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Features/Bevásárlás.md — per-user active shopping list, without its items.
 * {@code status}/{@code completedAt} exist for the whole Bevásárlás cluster's schema but are not
 * yet mutated by this slice (documentation/Subfeatures/Bevásárlólista írás.md) — only the future
 * "teljesítve" endpoint ever flips a list to {@code ARCHIVED}.
 */
@Entity
@Table(name = "shopping_list")
public class ShoppingListEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column
	private String name;

	@Column(nullable = false)
	private String status = "ACTIVE";

	@Column(name = "completed_at")
	private OffsetDateTime completedAt;

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

	protected ShoppingListEntity() {
	}

	public ShoppingListEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getStatus() {
		return status;
	}

	/** documentation/Subfeatures/Bevásárlás teljesítve.md — the only place this ever changes: ACTIVE → ARCHIVED on completion. */
	public void setStatus(String status) {
		this.status = status;
	}

	public OffsetDateTime getCompletedAt() {
		return completedAt;
	}

	public void setCompletedAt(OffsetDateTime completedAt) {
		this.completedAt = completedAt;
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
