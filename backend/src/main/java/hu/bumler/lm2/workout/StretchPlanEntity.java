package hu.bumler.lm2.workout;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168) — a stretching template, without
 * its items. Per-user like {@code WorkoutPlanEntity}; never part of the rotation (no {@code inRotation}),
 * {@code active} only drives the pickers.
 */
@Entity
@Table(name = "stretch_plan")
public class StretchPlanEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@Column
	private String notes;

	@Column(nullable = false)
	private boolean active = true;

	@Column(name = "goal_label")
	private String goalLabel;

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

	protected StretchPlanEntity() {
	}

	public StretchPlanEntity(UUID id, UUID userId) {
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

	public String getNotes() {
		return notes;
	}

	public boolean isActive() {
		return active;
	}

	public String getGoalLabel() {
		return goalLabel;
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

	public void setName(String name) {
		this.name = name;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public void setGoalLabel(String goalLabel) {
		this.goalLabel = goalLabel;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}

	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
