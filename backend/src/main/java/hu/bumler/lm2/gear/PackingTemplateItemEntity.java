package hu.bumler.lm2.gear;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/** documentation/Subfeatures/Sablonok.md — a GearItem reference inside a PackingTemplate, own sync entity. */
@Entity
@Table(name = "packing_template_item")
public class PackingTemplateItemEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "template_id", nullable = false)
	private UUID templateId;

	@Column(name = "gear_item_id", nullable = false)
	private UUID gearItemId;

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

	protected PackingTemplateItemEntity() {
	}

	public PackingTemplateItemEntity(UUID id, UUID userId, UUID templateId, UUID gearItemId, int sortOrder) {
		this.id = id;
		this.userId = userId;
		this.templateId = templateId;
		this.gearItemId = gearItemId;
		this.sortOrder = sortOrder;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getTemplateId() {
		return templateId;
	}

	public UUID getGearItemId() {
		return gearItemId;
	}

	public void setGearItemId(UUID gearItemId) {
		this.gearItemId = gearItemId;
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

	/** Reverses {@link #softDelete()} — a tombstoned row reappearing in an incoming live tree is revived, not left dead underneath it. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
