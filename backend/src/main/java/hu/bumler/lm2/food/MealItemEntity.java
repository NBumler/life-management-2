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
 * documentation/Subfeatures/Étkezés.md "Tétel — közös" — polymorphic meal item, own sync entity
 * (mirrors recipe_ingredient's shape), but no {@code user_id} of its own even though its parent
 * {@code Meal} IS per-user (ownership flows through {@code mealId}). One flat table for all three
 * source types (RECIPE / FOOD / CUSTOM); unused per-type columns stay null.
 */
@Entity
@Table(name = "meal_item")
public class MealItemEntity {

	@Id
	private UUID id;

	@Column(name = "meal_id", nullable = false)
	private UUID mealId;

	@Column(nullable = false)
	private String type;

	@Column(name = "recipe_id")
	private UUID recipeId;

	@Column(name = "food_id")
	private UUID foodId;

	@Column(name = "quantity_amount")
	private BigDecimal quantityAmount;

	@Column(name = "quantity_unit")
	private String quantityUnit;

	@Column(name = "display_name")
	private String displayName;

	@Column(name = "calories_kcal")
	private BigDecimal caloriesKcal;

	@Column(name = "protein_g")
	private BigDecimal proteinG;

	@Column(name = "carbs_g")
	private BigDecimal carbsG;

	@Column(name = "fat_g")
	private BigDecimal fatG;

	@Column(name = "price_huf")
	private Integer priceHuf;

	@Column(nullable = false)
	private BigDecimal servings;

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

	protected MealItemEntity() {
	}

	public MealItemEntity(UUID id, UUID mealId, String type, int sortOrder) {
		this.id = id;
		this.mealId = mealId;
		this.type = type;
		this.sortOrder = sortOrder;
	}

	public UUID getId() {
		return id;
	}

	public UUID getMealId() {
		return mealId;
	}

	public String getType() {
		return type;
	}

	public void setType(String type) {
		this.type = type;
	}

	public UUID getRecipeId() {
		return recipeId;
	}

	public void setRecipeId(UUID recipeId) {
		this.recipeId = recipeId;
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

	public String getDisplayName() {
		return displayName;
	}

	public void setDisplayName(String displayName) {
		this.displayName = displayName;
	}

	public BigDecimal getCaloriesKcal() {
		return caloriesKcal;
	}

	public void setCaloriesKcal(BigDecimal caloriesKcal) {
		this.caloriesKcal = caloriesKcal;
	}

	public BigDecimal getProteinG() {
		return proteinG;
	}

	public void setProteinG(BigDecimal proteinG) {
		this.proteinG = proteinG;
	}

	public BigDecimal getCarbsG() {
		return carbsG;
	}

	public void setCarbsG(BigDecimal carbsG) {
		this.carbsG = carbsG;
	}

	public BigDecimal getFatG() {
		return fatG;
	}

	public void setFatG(BigDecimal fatG) {
		this.fatG = fatG;
	}

	public Integer getPriceHuf() {
		return priceHuf;
	}

	public void setPriceHuf(Integer priceHuf) {
		this.priceHuf = priceHuf;
	}

	public BigDecimal getServings() {
		return servings;
	}

	public void setServings(BigDecimal servings) {
		this.servings = servings;
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
