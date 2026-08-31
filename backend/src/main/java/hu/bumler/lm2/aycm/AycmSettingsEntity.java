package hu.bumler.lm2.aycm;

import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Features/AYCM tracker.md — the 1:1-per-user AYCM settings singleton. Its only real
 * field is the optional link to a RecurringExpense (the monthly pass); there is deliberately no FK
 * to recurring_expense (loose coupling — the client decides whether the linked row still counts).
 * {@code id} is a deterministic client UUID v5 of "AycmSettings:&lt;userId&gt;".
 */
@Entity
@Table(name = "aycm_settings")
public class AycmSettingsEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "linked_recurring_expense_id")
	private UUID linkedRecurringExpenseId;

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

	protected AycmSettingsEntity() {
	}

	public AycmSettingsEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getLinkedRecurringExpenseId() {
		return linkedRecurringExpenseId;
	}

	public void setLinkedRecurringExpenseId(UUID linkedRecurringExpenseId) {
		this.linkedRecurringExpenseId = linkedRecurringExpenseId;
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
}
