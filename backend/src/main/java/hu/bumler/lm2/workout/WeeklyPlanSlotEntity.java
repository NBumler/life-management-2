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
 * documentation/Subfeatures/Heti terv.md "slots" — one day → template assignment on a WeeklyPlan. A
 * slot exists only where a template is assigned; clearing a day soft-deletes its slot. No
 * {@code user_id} — ownership flows through {@code weeklyPlanId}.
 */
@Entity
@Table(name = "weekly_plan_slot")
public class WeeklyPlanSlotEntity {

	@Id
	private UUID id;

	@Column(name = "weekly_plan_id", nullable = false)
	private UUID weeklyPlanId;

	@Column(name = "day_of_week", nullable = false)
	private String dayOfWeek;

	@Column(name = "plan_id", nullable = false)
	private UUID planId;

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

	protected WeeklyPlanSlotEntity() {
	}

	public WeeklyPlanSlotEntity(UUID id, UUID weeklyPlanId) {
		this.id = id;
		this.weeklyPlanId = weeklyPlanId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getWeeklyPlanId() {
		return weeklyPlanId;
	}

	public String getDayOfWeek() {
		return dayOfWeek;
	}

	public void setDayOfWeek(String dayOfWeek) {
		this.dayOfWeek = dayOfWeek;
	}

	public UUID getPlanId() {
		return planId;
	}

	public void setPlanId(UUID planId) {
		this.planId = planId;
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

	/** Reverses {@link #softDelete()} — a tombstoned slot reappearing in an incoming live tree is revived. */
	public void undelete() {
		this.deleted = false;
		this.deletedAt = null;
	}
}
