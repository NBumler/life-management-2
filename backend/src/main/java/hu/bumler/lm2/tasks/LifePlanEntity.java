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
 * documentation/Subfeatures/Élet tervek.md — user-owned long-term life goal. List-only: not a
 * calendar event, not a recurring household task, not a Naptár producer in the MVP.
 */
@Entity
@Table(name = "life_plan")
public class LifePlanEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String title;

	@Column
	private String notes;

	@Column(nullable = false)
	private String status = "PLANNED";

	@Column(name = "target_date")
	private LocalDate targetDate;

	@Column(name = "completed_at")
	private OffsetDateTime completedAt;

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

	protected LifePlanEntity() {
	}

	public LifePlanEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public String getStatus() {
		return status;
	}

	public LocalDate getTargetDate() {
		return targetDate;
	}

	public void setTargetDate(LocalDate targetDate) {
		this.targetDate = targetDate;
	}

	public OffsetDateTime getCompletedAt() {
		return completedAt;
	}

	/**
	 * documentation/Subfeatures/Élet tervek.md "Állapotgép": completedAt is a client-computed side
	 * effect of a status change (pure TS, documentation/Architektúra/Frontend.md) — this just stores
	 * whatever the client sent, after LifePlanService has validated the status/completedAt pair is
	 * internally consistent.
	 */
	public void applyStatus(String status, OffsetDateTime completedAt) {
		this.status = status;
		this.completedAt = completedAt;
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
