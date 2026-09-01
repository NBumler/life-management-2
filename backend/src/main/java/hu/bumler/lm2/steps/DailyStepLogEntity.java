package hu.bumler.lm2.steps;

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
 * documentation/Features/Lépésszám követés.md — one step-count record per user per calendar day.
 * Flat, user-owned, plain CRUD like {@code SwimLogEntity}. No kcal / body-weight column: the aznapi
 * activityExtraKcal step contribution is a pure client calculation (documentation/Features/Tápérték
 * kalkulátor.md). {@code id} is a deterministic client UUID v5 of "DailyStepLog:&lt;userId&gt;:&lt;date&gt;",
 * so a POST for an already-existing / soft-deleted day resolves to / revives that day's row
 * (mirrors {@code WeeklyPlanEntity}).
 */
@Entity
@Table(name = "daily_step_log")
public class DailyStepLogEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "log_date", nullable = false)
	private LocalDate logDate;

	@Column(name = "step_count", nullable = false)
	private int stepCount;

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

	protected DailyStepLogEntity() {
	}

	public DailyStepLogEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getLogDate() {
		return logDate;
	}

	public void setLogDate(LocalDate logDate) {
		this.logDate = logDate;
	}

	public int getStepCount() {
		return stepCount;
	}

	public void setStepCount(int stepCount) {
		this.stepCount = stepCount;
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

	/** Reverses {@link #softDelete()} — a POST re-creating the same day (same v5 id) revives it. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
