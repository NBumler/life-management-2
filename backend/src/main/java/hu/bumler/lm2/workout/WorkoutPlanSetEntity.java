package hu.bumler.lm2.workout;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Heti terv.md "targetSets" — one target set on a template exercise line.
 * Same field shape as {@code WorkoutSetEntryEntity} minus {@code setNumber}/{@code completed} (a
 * template set has no completed state; ordering is {@code orderIndex} alone). No {@code user_id} —
 * ownership flows through {@code planExerciseId → planId}.
 */
@Entity
@Table(name = "workout_plan_set")
public class WorkoutPlanSetEntity {

	@Id
	private UUID id;

	@Column(name = "plan_exercise_id", nullable = false)
	private UUID planExerciseId;

	@Column(name = "set_type", nullable = false)
	private String setType;

	@Column
	private Integer reps;

	@Column(name = "weight_kg")
	private BigDecimal weightKg;

	@Column(name = "hold_time_seconds")
	private Integer holdTimeSeconds;

	@Column(name = "edge_size_mm")
	private Integer edgeSizeMm;

	@Column(name = "distance_meters")
	private Integer distanceMeters;

	@Column(name = "rest_time_seconds")
	private Integer restTimeSeconds;

	@Column(name = "order_index", nullable = false)
	private int orderIndex;

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

	protected WorkoutPlanSetEntity() {
	}

	public WorkoutPlanSetEntity(UUID id, UUID planExerciseId) {
		this.id = id;
		this.planExerciseId = planExerciseId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPlanExerciseId() {
		return planExerciseId;
	}

	public String getSetType() {
		return setType;
	}

	public void setSetType(String setType) {
		this.setType = setType;
	}

	public Integer getReps() {
		return reps;
	}

	public void setReps(Integer reps) {
		this.reps = reps;
	}

	public BigDecimal getWeightKg() {
		return weightKg;
	}

	public void setWeightKg(BigDecimal weightKg) {
		this.weightKg = weightKg;
	}

	public Integer getHoldTimeSeconds() {
		return holdTimeSeconds;
	}

	public void setHoldTimeSeconds(Integer holdTimeSeconds) {
		this.holdTimeSeconds = holdTimeSeconds;
	}

	public Integer getEdgeSizeMm() {
		return edgeSizeMm;
	}

	public void setEdgeSizeMm(Integer edgeSizeMm) {
		this.edgeSizeMm = edgeSizeMm;
	}

	public Integer getDistanceMeters() {
		return distanceMeters;
	}

	public void setDistanceMeters(Integer distanceMeters) {
		this.distanceMeters = distanceMeters;
	}

	public Integer getRestTimeSeconds() {
		return restTimeSeconds;
	}

	public void setRestTimeSeconds(Integer restTimeSeconds) {
		this.restTimeSeconds = restTimeSeconds;
	}

	public int getOrderIndex() {
		return orderIndex;
	}

	public void setOrderIndex(int orderIndex) {
		this.orderIndex = orderIndex;
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

	/** Reverses {@link #softDelete()} — a tombstoned row reappearing in an incoming live tree is revived. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
