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
 * documentation/Subfeatures/Recept.md — a Food reference inside a Recipe, own sync entity. Shared/
 * global like RecipeEntity/FoodEntity — no {@code user_id}, unlike gear's PackingTemplateItem.
 */
@Entity
@Table(name = "recipe_ingredient")
public class RecipeIngredientEntity {

	@Id
	private UUID id;

	@Column(name = "recipe_id", nullable = false)
	private UUID recipeId;

	@Column(name = "food_id", nullable = false)
	private UUID foodId;

	@Column(name = "quantity_amount", nullable = false)
	private BigDecimal quantityAmount;

	@Column(name = "quantity_unit", nullable = false)
	private String quantityUnit;

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

	protected RecipeIngredientEntity() {
	}

	public RecipeIngredientEntity(UUID id, UUID recipeId, UUID foodId, BigDecimal quantityAmount, String quantityUnit, int sortOrder) {
		this.id = id;
		this.recipeId = recipeId;
		this.foodId = foodId;
		this.quantityAmount = quantityAmount;
		this.quantityUnit = quantityUnit;
		this.sortOrder = sortOrder;
	}

	public UUID getId() {
		return id;
	}

	public UUID getRecipeId() {
		return recipeId;
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
