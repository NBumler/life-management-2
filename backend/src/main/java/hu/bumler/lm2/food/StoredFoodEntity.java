package hu.bumler.lm2.food;

import java.math.BigDecimal;
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
 * documentation/Subfeatures/Élelmiszer tárolás.md — a single home-storage item, referencing the
 * (global) {@code food} catalog. Unlike {@code Food}, this is per-user and each row is independent
 * (no merging by food+location+expiry).
 */
@Entity
@Table(name = "stored_food")
public class StoredFoodEntity {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "food_id", nullable = false)
	private UUID foodId;

	@Column(name = "quantity_amount", nullable = false)
	private BigDecimal quantityAmount;

	@Column(name = "quantity_unit", nullable = false)
	private String quantityUnit;

	@Column(name = "storage_location", nullable = false)
	private String storageLocation;

	@Column(name = "expires_on", nullable = false)
	private LocalDate expiresOn;

	@Column(nullable = false)
	private boolean opened;

	@Column(name = "opened_at")
	private OffsetDateTime openedAt;

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

	protected StoredFoodEntity() {
	}

	public StoredFoodEntity(UUID id, UUID userId) {
		this.id = id;
		this.userId = userId;
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getFoodId() {
		return foodId;
	}

	public void setFoodId(UUID foodId) {
		this.foodId = foodId;
	}

	public BigDecimal getQuantityAmount() {
		return quantityAmount;
	}

	public String getQuantityUnit() {
		return quantityUnit;
	}

	public void setQuantity(BigDecimal amount, String unit) {
		this.quantityAmount = amount;
		this.quantityUnit = unit;
	}

	public String getStorageLocation() {
		return storageLocation;
	}

	public void setStorageLocation(String storageLocation) {
		this.storageLocation = storageLocation;
	}

	public LocalDate getExpiresOn() {
		return expiresOn;
	}

	public void setExpiresOn(LocalDate expiresOn) {
		this.expiresOn = expiresOn;
	}

	public boolean isOpened() {
		return opened;
	}

	public OffsetDateTime getOpenedAt() {
		return openedAt;
	}

	/** documentation/Subfeatures/Élelmiszer tárolás.md "Felbontás": opened + openedAt always change together, and never back to false. */
	public void setOpened(boolean opened, OffsetDateTime openedAt) {
		this.opened = opened;
		this.openedAt = openedAt;
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
