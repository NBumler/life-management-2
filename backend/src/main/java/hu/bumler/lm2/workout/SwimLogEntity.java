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
 * documentation/Features/Úszás napló.md — one logged swim session ("egy napló = egy edzés").
 * Flat, user-owned, plain CRUD like {@code LifePlanEntity}. No kcal / body-weight column: the
 * aznapi activityExtraKcal contribution is a pure client calculation (documentation/Features/Tápérték
 * kalkulátor.md). {@code poolLengthMeters} / {@code lapCount} / {@code distanceMeters} are
 * log/statistics only, never part of the MET formula.
 */
@Entity
@Table(name = "swim_log")
public class SwimLogEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "swim_date", nullable = false)
	private LocalDate swimDate;

	@Column(name = "duration_minutes", nullable = false)
	private int durationMinutes;

	@Column(nullable = false)
	private String intensity;

	@Column(name = "pool_length_meters")
	private Integer poolLengthMeters;

	@Column(name = "lap_count")
	private Integer lapCount;

	@Column(name = "distance_meters")
	private Integer distanceMeters;

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

	protected SwimLogEntity() {
	}

	public SwimLogEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getSwimDate() {
		return swimDate;
	}

	public void setSwimDate(LocalDate swimDate) {
		this.swimDate = swimDate;
	}

	public int getDurationMinutes() {
		return durationMinutes;
	}

	public void setDurationMinutes(int durationMinutes) {
		this.durationMinutes = durationMinutes;
	}

	public String getIntensity() {
		return intensity;
	}

	public void setIntensity(String intensity) {
		this.intensity = intensity;
	}

	public Integer getPoolLengthMeters() {
		return poolLengthMeters;
	}

	public void setPoolLengthMeters(Integer poolLengthMeters) {
		this.poolLengthMeters = poolLengthMeters;
	}

	public Integer getLapCount() {
		return lapCount;
	}

	public void setLapCount(Integer lapCount) {
		this.lapCount = lapCount;
	}

	public Integer getDistanceMeters() {
		return distanceMeters;
	}

	public void setDistanceMeters(Integer distanceMeters) {
		this.distanceMeters = distanceMeters;
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
