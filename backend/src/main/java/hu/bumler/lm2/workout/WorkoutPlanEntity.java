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
 * documentation/Subfeatures/Heti terv.md — a static training template / routine, without its exercise
 * lines. Per-user like {@code WorkoutSessionEntity}. {@code active} is a plain field toggled through
 * the ordinary nested PUT (no dedicated endpoint); turning it off hides the template from the pickers
 * but never touches past {@code WorkoutSession.planId} / {@code WeeklyPlanSlot} rows pointing at it.
 */
@Entity
@Table(name = "workout_plan")
public class WorkoutPlanEntity {

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

	@Column(name = "default_workout_type")
	private String defaultWorkoutType;

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

	protected WorkoutPlanEntity() {
	}

	public WorkoutPlanEntity(UUID id, UUID userId) {
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

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
	}

	public String getGoalLabel() {
		return goalLabel;
	}

	public void setGoalLabel(String goalLabel) {
		this.goalLabel = goalLabel;
	}

	public String getDefaultWorkoutType() {
		return defaultWorkoutType;
	}

	public void setDefaultWorkoutType(String defaultWorkoutType) {
		this.defaultWorkoutType = defaultWorkoutType;
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

	/** Reverses {@link #softDelete()} — a POST re-creating a plan whose id was tombstoned revives it. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
