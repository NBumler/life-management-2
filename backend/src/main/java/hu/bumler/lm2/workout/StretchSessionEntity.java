package hu.bumler.lm2.workout;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Nyújtás.md (backlog/169) — one logged stretching session, without its items.
 * Never a load day; no kcal column (a client calculation from {@code durationMinutes}).
 */
@Entity
@Table(name = "stretch_session")
public class StretchSessionEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "session_date", nullable = false)
	private LocalDate date;

	@Column(name = "start_time")
	private String startTime;

	@Column(name = "end_time")
	private String endTime;

	@Column(name = "duration_minutes", nullable = false)
	private int durationMinutes;

	@Column(name = "stretch_plan_id")
	private UUID stretchPlanId;

	@Column(name = "workout_session_id")
	private UUID workoutSessionId;

	@Column
	private String notes;

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

	protected StretchSessionEntity() {
	}

	public StretchSessionEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getDate() {
		return date;
	}

	public String getStartTime() {
		return startTime;
	}

	public String getEndTime() {
		return endTime;
	}

	public int getDurationMinutes() {
		return durationMinutes;
	}

	public UUID getStretchPlanId() {
		return stretchPlanId;
	}

	public UUID getWorkoutSessionId() {
		return workoutSessionId;
	}

	public String getNotes() {
		return notes;
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

	public void setDate(LocalDate date) {
		this.date = date;
	}

	public void setStartTime(String startTime) {
		this.startTime = startTime;
	}

	public void setEndTime(String endTime) {
		this.endTime = endTime;
	}

	public void setDurationMinutes(int durationMinutes) {
		this.durationMinutes = durationMinutes;
	}

	public void setStretchPlanId(UUID stretchPlanId) {
		this.stretchPlanId = stretchPlanId;
	}

	public void setWorkoutSessionId(UUID workoutSessionId) {
		this.workoutSessionId = workoutSessionId;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public void softDelete() {
		this.deleted = true;
		this.deletedAt = OffsetDateTime.now();
	}
}
