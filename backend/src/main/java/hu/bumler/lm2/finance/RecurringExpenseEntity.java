package hu.bumler.lm2.finance;

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
 * documentation/Subfeatures/Rendszeres kiadások.md — one recurring, fixed-amount expense. Flat,
 * user-owned, plain CRUD like {@code SwimLogEntity} / {@code LifePlanEntity}. The monthly equivalent
 * consumed by the Pénzügyek dashboard and the AYCM "megéri-e" card is a pure client utility; the
 * server neither computes it nor auto-rolls {@code nextBillingDate} ("Fizetve" is a plain PUT with a
 * client-computed date). {@code billingDayOfMonth} is the intended day-of-period, kept in sync with
 * {@code nextBillingDate} only by the client on create / manual date edit.
 */
@Entity
@Table(name = "recurring_expense")
public class RecurringExpenseEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private String name;

	@Column(name = "amount_huf", nullable = false)
	private int amountHuf;

	@Column(nullable = false)
	private String frequency;

	@Column(nullable = false)
	private String category;

	@Column(name = "next_billing_date", nullable = false)
	private LocalDate nextBillingDate;

	@Column(name = "billing_day_of_month", nullable = false)
	private short billingDayOfMonth;

	@Column(nullable = false)
	private boolean active = true;

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

	protected RecurringExpenseEntity() {
	}

	public RecurringExpenseEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public int getAmountHuf() {
		return amountHuf;
	}

	public void setAmountHuf(int amountHuf) {
		this.amountHuf = amountHuf;
	}

	public String getFrequency() {
		return frequency;
	}

	public void setFrequency(String frequency) {
		this.frequency = frequency;
	}

	public String getCategory() {
		return category;
	}

	public void setCategory(String category) {
		this.category = category;
	}

	public LocalDate getNextBillingDate() {
		return nextBillingDate;
	}

	public void setNextBillingDate(LocalDate nextBillingDate) {
		this.nextBillingDate = nextBillingDate;
	}

	public short getBillingDayOfMonth() {
		return billingDayOfMonth;
	}

	public void setBillingDayOfMonth(short billingDayOfMonth) {
		this.billingDayOfMonth = billingDayOfMonth;
	}

	public boolean isActive() {
		return active;
	}

	public void setActive(boolean active) {
		this.active = active;
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
