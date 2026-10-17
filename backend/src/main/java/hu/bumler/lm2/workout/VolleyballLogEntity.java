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
 * documentation/Features/Röplabda napló.md — one logged (indoor) volleyball session. Flat,
 * user-owned, plain CRUD like {@code SwimLogEntity}. No kcal / body-weight column: the aznapi
 * activityExtraKcal contribution is a pure client calculation with one fixed, conservative net MET
 * (documentation/Features/Tápérték kalkulátor.md). {@code intensity} / {@code setsPlayed} /
 * {@code notes} are log/statistics only, never part of the kcal formula.
 */
@Entity
@Table(name = "volleyball_log")
public class VolleyballLogEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "volleyball_date", nullable = false)
	private LocalDate volleyballDate;

	@Column(name = "duration_minutes", nullable = false)
	private int durationMinutes;

	private String intensity;

	@Column(name = "sets_played")
	private Integer setsPlayed;

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

	protected VolleyballLogEntity() {
	}

	public VolleyballLogEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getVolleyballDate() {
		return volleyballDate;
	}

	public void setVolleyballDate(LocalDate volleyballDate) {
		this.volleyballDate = volleyballDate;
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

	public Integer getSetsPlayed() {
		return setsPlayed;
	}

	public void setSetsPlayed(Integer setsPlayed) {
		this.setsPlayed = setsPlayed;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
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
