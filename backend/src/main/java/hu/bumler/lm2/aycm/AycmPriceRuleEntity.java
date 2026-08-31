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
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — one time-band price rule of a partner.
 * The rule is the opening-hours window: half-open [startTime, endTime) on the flagged weekdays.
 * startTime / endTime are "HH:mm" strings ("24:00" allowed on endTime only). Live rules of the same
 * partner that share a weekday must have disjoint intervals (checked in {@code AycmPriceRuleService}).
 */
@Entity
@Table(name = "aycm_price_rule")
public class AycmPriceRuleEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "partner_id", nullable = false)
	private UUID partnerId;

	@Column
	private String label;

	@Column(name = "applies_mon", nullable = false)
	private boolean appliesMon;

	@Column(name = "applies_tue", nullable = false)
	private boolean appliesTue;

	@Column(name = "applies_wed", nullable = false)
	private boolean appliesWed;

	@Column(name = "applies_thu", nullable = false)
	private boolean appliesThu;

	@Column(name = "applies_fri", nullable = false)
	private boolean appliesFri;

	@Column(name = "applies_sat", nullable = false)
	private boolean appliesSat;

	@Column(name = "applies_sun", nullable = false)
	private boolean appliesSun;

	@Column(name = "start_time", nullable = false)
	private String startTime;

	@Column(name = "end_time", nullable = false)
	private String endTime;

	@Column(name = "list_price_huf", nullable = false)
	private int listPriceHuf;

	@Column(name = "co_payment_huf", nullable = false)
	private int coPaymentHuf;

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

	protected AycmPriceRuleEntity() {
	}

	public AycmPriceRuleEntity(UUID id, UUID userId, UUID partnerId) {
		this.id = id;
		this.userId = userId;
		this.partnerId = partnerId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getPartnerId() {
		return partnerId;
	}

	public String getLabel() {
		return label;
	}

	public void setLabel(String label) {
		this.label = label;
	}

	public boolean isAppliesMon() {
		return appliesMon;
	}

	public void setAppliesMon(boolean appliesMon) {
		this.appliesMon = appliesMon;
	}

	public boolean isAppliesTue() {
		return appliesTue;
	}

	public void setAppliesTue(boolean appliesTue) {
		this.appliesTue = appliesTue;
	}

	public boolean isAppliesWed() {
		return appliesWed;
	}

	public void setAppliesWed(boolean appliesWed) {
		this.appliesWed = appliesWed;
	}

	public boolean isAppliesThu() {
		return appliesThu;
	}

	public void setAppliesThu(boolean appliesThu) {
		this.appliesThu = appliesThu;
	}

	public boolean isAppliesFri() {
		return appliesFri;
	}

	public void setAppliesFri(boolean appliesFri) {
		this.appliesFri = appliesFri;
	}

	public boolean isAppliesSat() {
		return appliesSat;
	}

	public void setAppliesSat(boolean appliesSat) {
		this.appliesSat = appliesSat;
	}

	public boolean isAppliesSun() {
		return appliesSun;
	}

	public void setAppliesSun(boolean appliesSun) {
		this.appliesSun = appliesSun;
	}

	public String getStartTime() {
		return startTime;
	}

	public void setStartTime(String startTime) {
		this.startTime = startTime;
	}

	public String getEndTime() {
		return endTime;
	}

	public void setEndTime(String endTime) {
		this.endTime = endTime;
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
