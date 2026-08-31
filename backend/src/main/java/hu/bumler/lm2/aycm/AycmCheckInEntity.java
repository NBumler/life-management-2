package hu.bumler.lm2.aycm;

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
 * documentation/Subfeatures/AYCM Check-In.md — one AYCM entry for a calendar day. Flat, user-owned;
 * the row is a snapshot the client assembled (partner name, band label, list price, co-pay, visit
 * value). The server never re-runs the price-rule match. At most one live row per user per
 * {@code checkInDate} (partial unique index; see {@code AycmCheckInService} for the pre-check).
 */
@Entity
@Table(name = "aycm_check_in")
public class AycmCheckInEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "check_in_date", nullable = false)
	private LocalDate checkInDate;

	@Column(name = "check_in_time", nullable = false)
	private String checkInTime;

	@Column(name = "partner_id", nullable = false)
	private UUID partnerId;

	@Column(name = "partner_name", nullable = false)
	private String partnerName;

	@Column(name = "rule_id")
	private UUID ruleId;

	@Column(name = "rule_label", nullable = false)
	private String ruleLabel = "";

	@Column(name = "list_price_huf", nullable = false)
	private int listPriceHuf;

	@Column(name = "co_payment_huf", nullable = false)
	private int coPaymentHuf;

	@Column(name = "visit_value_huf", nullable = false)
	private int visitValueHuf;

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

	protected AycmCheckInEntity() {
	}

	public AycmCheckInEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public LocalDate getCheckInDate() {
		return checkInDate;
	}

	public void setCheckInDate(LocalDate checkInDate) {
		this.checkInDate = checkInDate;
	}

	public String getCheckInTime() {
		return checkInTime;
	}

	public void setCheckInTime(String checkInTime) {
		this.checkInTime = checkInTime;
	}

	public UUID getPartnerId() {
		return partnerId;
	}

	public void setPartnerId(UUID partnerId) {
		this.partnerId = partnerId;
	}

	public String getPartnerName() {
		return partnerName;
	}

	public void setPartnerName(String partnerName) {
		this.partnerName = partnerName;
	}

	public UUID getRuleId() {
		return ruleId;
	}

	public void setRuleId(UUID ruleId) {
		this.ruleId = ruleId;
	}

	public String getRuleLabel() {
		return ruleLabel;
	}

	public void setRuleLabel(String ruleLabel) {
		this.ruleLabel = ruleLabel;
	}

	public int getListPriceHuf() {
		return listPriceHuf;
	}

	public void setListPriceHuf(int listPriceHuf) {
		this.listPriceHuf = listPriceHuf;
	}

	public int getCoPaymentHuf() {
		return coPaymentHuf;
	}

	public void setCoPaymentHuf(int coPaymentHuf) {
		this.coPaymentHuf = coPaymentHuf;
	}

	public int getVisitValueHuf() {
		return visitValueHuf;
	}

	public void setVisitValueHuf(int visitValueHuf) {
		this.visitValueHuf = visitValueHuf;
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
