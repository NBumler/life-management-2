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
 * documentation/Subfeatures/Nyújtás.md (backlog/169) — one stretch of a logged session. Name / category
 * are a snapshot; {@code stretchExerciseId} is a soft link. No {@code user_id} — ownership flows through
 * {@code sessionId}.
 */
@Entity
@Table(name = "stretch_session_item")
public class StretchSessionItemEntity {

	@Id
	private UUID id;

	@Column(name = "session_id", nullable = false)
	private UUID sessionId;

	@Column(name = "stretch_exercise_id")
	private UUID stretchExerciseId;

	@Column(name = "stretch_name", nullable = false)
	private String stretchName;

	@Column(name = "stretch_category", nullable = false)
	private String stretchCategory;

	@Column(name = "order_index", nullable = false)
	private int orderIndex;

	@Column(name = "hold_seconds", nullable = false)
	private int holdSeconds;

	@Column(name = "per_side", nullable = false)
	private boolean perSide = false;

	@Column(nullable = false)
	private int repetitions = 1;

	@Column(nullable = false)
	private boolean completed = false;

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

	protected StretchSessionItemEntity() {
	}

	public StretchSessionItemEntity(UUID id, UUID sessionId) {
		this.id = id;
		this.sessionId = sessionId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getSessionId() {
		return sessionId;
	}

	public UUID getStretchExerciseId() {
		return stretchExerciseId;
	}

	public String getStretchName() {
		return stretchName;
	}

	public String getStretchCategory() {
		return stretchCategory;
	}

	public int getOrderIndex() {
		return orderIndex;
	}

	public int getHoldSeconds() {
		return holdSeconds;
	}

	public boolean isPerSide() {
		return perSide;
	}

	public int getRepetitions() {
		return repetitions;
	}

	public boolean isCompleted() {
		return completed;
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

	public void setStretchExerciseId(UUID stretchExerciseId) {
		this.stretchExerciseId = stretchExerciseId;
	}

	public void setStretchName(String stretchName) {
		this.stretchName = stretchName;
	}

	public void setStretchCategory(String stretchCategory) {
		this.stretchCategory = stretchCategory;
	}

	public void setOrderIndex(int orderIndex) {
		this.orderIndex = orderIndex;
	}

	public void setHoldSeconds(int holdSeconds) {
		this.holdSeconds = holdSeconds;
	}

	public void setPerSide(boolean perSide) {
		this.perSide = perSide;
	}

	public void setRepetitions(int repetitions) {
		this.repetitions = repetitions;
	}

	public void setCompleted(boolean completed) {
		this.completed = completed;
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
