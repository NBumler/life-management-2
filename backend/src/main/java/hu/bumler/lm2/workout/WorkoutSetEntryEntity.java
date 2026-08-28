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
 * documentation/Subfeatures/Edzésnapló.md "Entitás — WorkoutSetEntry" — one set on an exercise entry.
 * Units are kg / mm / m only; assist (band/pulley) is a negative {@code weightKg}. Which of the
 * optional measurement fields the client shows follows the parent entry's {@code exerciseKind}
 * snapshot; the server persists whatever is sent (deliberately loose type rule). No {@code user_id} —
 * ownership flows through {@code exerciseEntryId → sessionId}.
 */
@Entity
@Table(name = "workout_set_entry")
public class WorkoutSetEntryEntity {

	@Id
	private UUID id;

	@Column(name = "exercise_entry_id", nullable = false)
	private UUID exerciseEntryId;

	@Column(name = "set_number", nullable = false)
	private int setNumber;

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

	@Column(name = "is_completed", nullable = false)
	private boolean completed = true;

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

	protected WorkoutSetEntryEntity() {
	}

	public WorkoutSetEntryEntity(UUID id, UUID exerciseEntryId) {
		this.id = id;
		this.exerciseEntryId = exerciseEntryId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getExerciseEntryId() {
		return exerciseEntryId;
	}

	public int getSetNumber() {
		return setNumber;
	}

	public void setSetNumber(int setNumber) {
		this.setNumber = setNumber;
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

	public boolean isCompleted() {
		return completed;
	}

	public void setCompleted(boolean completed) {
		this.completed = completed;
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

	/** Reverses {@link #softDelete()} — a tombstoned row reappearing in an incoming live tree is revived, not left dead underneath it. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
