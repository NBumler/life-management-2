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
 * documentation/Subfeatures/Heti terv.md "Entitás — WorkoutPlanExercise" — one exercise line in a
 * template. {@code exerciseName}/{@code exerciseCategory}/{@code exerciseKind} are a snapshot taken at
 * edit time; unlike {@code WorkoutExerciseEntryEntity}, {@code exerciseId} is NOT NULL ("kötelező a
 * sablonban"). Own sync entity but no {@code user_id} — ownership flows through {@code planId}.
 */
@Entity
@Table(name = "workout_plan_exercise")
public class WorkoutPlanExerciseEntity {

	@Id
	private UUID id;

	@Column(name = "plan_id", nullable = false)
	private UUID planId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(name = "exercise_name", nullable = false)
	private String exerciseName;

	@Column(name = "exercise_category", nullable = false)
	private String exerciseCategory;

	@Column(name = "exercise_kind", nullable = false)
	private String exerciseKind;

	@Column(name = "order_index", nullable = false)
	private int orderIndex;

	@Column(name = "superset_group")
	private Integer supersetGroup;

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

	protected WorkoutPlanExerciseEntity() {
	}

	public WorkoutPlanExerciseEntity(UUID id, UUID planId) {
		this.id = id;
		this.planId = planId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getPlanId() {
		return planId;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public void setExerciseId(UUID exerciseId) {
		this.exerciseId = exerciseId;
	}

	public String getExerciseName() {
		return exerciseName;
	}

	public void setExerciseName(String exerciseName) {
		this.exerciseName = exerciseName;
	}

	public String getExerciseCategory() {
		return exerciseCategory;
	}

	public void setExerciseCategory(String exerciseCategory) {
		this.exerciseCategory = exerciseCategory;
	}

	public String getExerciseKind() {
		return exerciseKind;
	}

	public void setExerciseKind(String exerciseKind) {
		this.exerciseKind = exerciseKind;
	}

	public int getOrderIndex() {
		return orderIndex;
	}

	public void setOrderIndex(int orderIndex) {
		this.orderIndex = orderIndex;
	}

	public Integer getSupersetGroup() {
		return supersetGroup;
	}

	public void setSupersetGroup(Integer supersetGroup) {
		this.supersetGroup = supersetGroup;
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
