package hu.bumler.lm2.tasks;

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
 * documentation/Subfeatures/Háztartási feladatok.md — a recurring, room-scoped household chore.
 * `nextDue` / `lastCompletedAt` are rolled forward by the client (pure TS, kliens naptári nap); the
 * server only stores whatever it's sent.
 */
@Entity
@Table(name = "household_task")
public class HouseholdTaskEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "room_id", nullable = false)
	private UUID roomId;

	@Column(nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false)
	private String nameNormalized;

	@Column(name = "energy_level", nullable = false)
	private String energyLevel;

	@Column(name = "estimated_minutes", nullable = false)
	private int estimatedMinutes;

	@Column(name = "interval_days", nullable = false)
	private int intervalDays;

	@Column(name = "next_due", nullable = false)
	private LocalDate nextDue;

	@Column(name = "last_completed_at")
	private OffsetDateTime lastCompletedAt;

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

	protected HouseholdTaskEntity() {
	}

	public HouseholdTaskEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getRoomId() {
		return roomId;
	}

	/** documentation/Subfeatures/Háztartási feladatok.md "Szerkesztés": a helyiség áttehető. */
	public void setRoomId(UUID roomId) {
		this.roomId = roomId;
	}

	public String getName() {
		return name;
	}

	public String getNameNormalized() {
		return nameNormalized;
	}

	/** name and nameNormalized always change together — never set independently (see hu.bumler.lm2.common.NameNormalizer). */
	public void rename(String name, String nameNormalized) {
		this.name = name;
		this.nameNormalized = nameNormalized;
	}

	public String getEnergyLevel() {
		return energyLevel;
	}

	public void setEnergyLevel(String energyLevel) {
		this.energyLevel = energyLevel;
	}

	public int getEstimatedMinutes() {
		return estimatedMinutes;
	}

	public void setEstimatedMinutes(int estimatedMinutes) {
		this.estimatedMinutes = estimatedMinutes;
	}

	public int getIntervalDays() {
		return intervalDays;
	}

	public void setIntervalDays(int intervalDays) {
		this.intervalDays = intervalDays;
	}

	public LocalDate getNextDue() {
		return nextDue;
	}

	public void setNextDue(LocalDate nextDue) {
		this.nextDue = nextDue;
	}

	public OffsetDateTime getLastCompletedAt() {
		return lastCompletedAt;
	}

	public void setLastCompletedAt(OffsetDateTime lastCompletedAt) {
		this.lastCompletedAt = lastCompletedAt;
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
