package hu.bumler.lm2.climbing;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Outdoor köteles napló.md "PitchLog" — one pitch of an outdoor multi-pitch
 * rope attempt. Only ever saved nested inside a {@link ClimbingSessionEntity} (documentation/
 * Architektúra/Backend.md "Nested aggregate PUT"), but its own sync row. No {@code user_id} —
 * ownership flows through {@code attemptId → sessionId}. {@code isLead = false} marks a following
 * climber (active MET ×0.8 in the client kcal). {@code deleted} is cascade-soft only.
 */
@Entity
@Table(name = "pitch_log")
public class PitchLogEntity {

	@Id
	private UUID id;

	@Column(name = "attempt_id", nullable = false)
	private UUID attemptId;

	@Column(name = "pitch_number", nullable = false)
	private int pitchNumber;

	@Column(name = "is_lead", nullable = false)
	private boolean lead;

	@Column(name = "raw_grade")
	private String rawGrade;

	@Column(name = "absolute_difficulty_index")
	private Integer absoluteDifficultyIndex;

	@Column(name = "length_in_meters")
	private Double lengthInMeters;

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

	protected PitchLogEntity() {
	}

	public PitchLogEntity(UUID id, UUID attemptId) {
		this.id = id;
		this.attemptId = attemptId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getAttemptId() {
		return attemptId;
	}

	public int getPitchNumber() {
		return pitchNumber;
	}

	public void setPitchNumber(int pitchNumber) {
		this.pitchNumber = pitchNumber;
	}

	public boolean isLead() {
		return lead;
	}

	public void setLead(boolean lead) {
		this.lead = lead;
	}

	public String getRawGrade() {
		return rawGrade;
	}

	public void setRawGrade(String rawGrade) {
		this.rawGrade = rawGrade;
	}

	public Integer getAbsoluteDifficultyIndex() {
		return absoluteDifficultyIndex;
	}

	public void setAbsoluteDifficultyIndex(Integer absoluteDifficultyIndex) {
		this.absoluteDifficultyIndex = absoluteDifficultyIndex;
	}

	public Double getLengthInMeters() {
		return lengthInMeters;
	}

	public void setLengthInMeters(Double lengthInMeters) {
		this.lengthInMeters = lengthInMeters;
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
