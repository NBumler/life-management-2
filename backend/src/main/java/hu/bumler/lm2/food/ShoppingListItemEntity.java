package hu.bumler.lm2.food;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * documentation/Subfeatures/Bevásárlólista írás.md "Tétel hozzáadása" — polymorphic shopping list
 * item, own sync entity (mirrors meal_item's shape), no {@code user_id} of its own even though its
 * parent {@code ShoppingList} IS per-user (ownership flows through {@code shoppingListId}). One
 * flat table for both source types (FOOD / NON_FOOD); unused per-type columns stay null.
 */
@Entity
@Table(name = "shopping_list_item")
public class ShoppingListItemEntity {

	@Id
	private UUID id;

	@Column(name = "shopping_list_id", nullable = false)
	private UUID shoppingListId;

	@Column(nullable = false)
	private String type;

	@Column(name = "food_id")
	private UUID foodId;

	@Column
	private String name;

	@Column
	private String note;

	@Column(name = "quantity_amount")
	private BigDecimal quantityAmount;

	@Column(name = "quantity_unit")
	private String quantityUnit;

	@Column(nullable = false)
	private boolean checked = false;

	@Column(name = "sort_order", nullable = false)
	private int sortOrder;

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

	protected ShoppingListItemEntity() {
	}

	public ShoppingListItemEntity(UUID id, UUID shoppingListId, String type, int sortOrder) {
		this.id = id;
		this.shoppingListId = shoppingListId;
		this.type = type;
		this.sortOrder = sortOrder;
	}

	public UUID getId() {
		return id;
	}

	public UUID getShoppingListId() {
		return shoppingListId;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public UUID getFoodId() {
		return foodId;
	}

	public void setFoodId(UUID foodId) {
		this.foodId = foodId;
	}

	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
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

	public boolean isChecked() {
		return checked;
	}

	public void setChecked(boolean checked) {
		this.checked = checked;
	}

	public int getSortOrder() {
		return sortOrder;
	}

	public void setSortOrder(int sortOrder) {
		this.sortOrder = sortOrder;
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
