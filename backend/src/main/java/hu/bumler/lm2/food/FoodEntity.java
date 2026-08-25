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
 * documentation/Subfeatures/Élelmiszerek.md — the first shared/global catalog entity in this
 * codebase: no {@code user_id}, every authenticated user sees and can edit every live row. Only
 * {@code name} is required; every other field is an optional partial-item value.
 */
@Entity
@Table(name = "food")
public class FoodEntity {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String name;

	@Column(name = "name_normalized", nullable = false)
	private String nameNormalized;

	@Column
	private String store;

	@Column
	private String brand;

	@Column
	private String barcode;

	@Column(name = "barcode_normalized")
	private String barcodeNormalized;

	@Column
	private String note;

	@Column(name = "price_huf")
	private Integer priceHuf;

	@Column(name = "net_amount")
	private BigDecimal netAmount;

	@Column(name = "net_unit")
	private String netUnit;

	@Column(name = "energy_kcal")
	private BigDecimal energyKcal;

	@Column(name = "fat_g")
	private BigDecimal fatG;

	@Column(name = "fat_saturated_g")
	private BigDecimal fatSaturatedG;

	@Column(name = "fat_unsaturated_g")
	private BigDecimal fatUnsaturatedG;

	@Column(name = "fat_trans_g")
	private BigDecimal fatTransG;

	@Column(name = "carbs_g")
	private BigDecimal carbsG;

	@Column(name = "carbs_sugars_g")
	private BigDecimal carbsSugarsG;

	@Column(name = "carbs_complex_g")
	private BigDecimal carbsComplexG;

	@Column(name = "carbs_fiber_g")
	private BigDecimal carbsFiberG;

	@Column(name = "protein_g")
	private BigDecimal proteinG;

	@Column(name = "salt_g")
	private BigDecimal saltG;

	@Column(name = "sodium_g")
	private BigDecimal sodiumG;

	@Column(name = "chloride_g")
	private BigDecimal chlorideG;

	@Column(name = "shelf_room_amount")
	private BigDecimal shelfRoomAmount;

	@Column(name = "shelf_room_unit")
	private String shelfRoomUnit;

	@Column(name = "shelf_fridge_amount")
	private BigDecimal shelfFridgeAmount;

	@Column(name = "shelf_fridge_unit")
	private String shelfFridgeUnit;

	@Column(name = "shelf_freezer_amount")
	private BigDecimal shelfFreezerAmount;

	@Column(name = "shelf_freezer_unit")
	private String shelfFreezerUnit;

	@Column(name = "shelf_after_opening_amount")
	private BigDecimal shelfAfterOpeningAmount;

	@Column(name = "shelf_after_opening_unit")
	private String shelfAfterOpeningUnit;

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

	protected FoodEntity() {
	}

	public FoodEntity(UUID id) {
		this.id = id;
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getNameNormalized() {
		return nameNormalized;
	}

	/** name and nameNormalized always change together — never set independently (see hu.bumler.lm2.common.NameNormalizer). */
	public void rename(String name, String nameNormalized) {
		this.name = name;
		this.nameNormalized = nameNormalized;
	}

	public String getStore() {
		return store;
	}

	public void setStore(String store) {
		this.store = store;
	}

	public String getBrand() {
		return brand;
	}

	public void setBrand(String brand) {
		this.brand = brand;
	}

	public String getBarcode() {
		return barcode;
	}

	public String getBarcodeNormalized() {
		return barcodeNormalized;
	}

	/** barcode and barcodeNormalized always change together (see hu.bumler.lm2.common.BarcodeNormalizer). */
	public void setBarcode(String barcode, String barcodeNormalized) {
		this.barcode = barcode;
		this.barcodeNormalized = barcodeNormalized;
	}

	public String getNote() {
		return note;
	}

	public void setNote(String note) {
		this.note = note;
	}

	public Integer getPriceHuf() {
		return priceHuf;
	}

	public void setPriceHuf(Integer priceHuf) {
		this.priceHuf = priceHuf;
	}

	public BigDecimal getNetAmount() {
		return netAmount;
	}

	public String getNetUnit() {
		return netUnit;
	}

	public void setNetAmount(BigDecimal netAmount, String netUnit) {
		this.netAmount = netAmount;
		this.netUnit = netUnit;
	}

	public BigDecimal getEnergyKcal() {
		return energyKcal;
	}

	public void setEnergyKcal(BigDecimal energyKcal) {
		this.energyKcal = energyKcal;
	}

	public BigDecimal getFatG() {
		return fatG;
	}

	public void setFatG(BigDecimal fatG) {
		this.fatG = fatG;
	}

	public BigDecimal getFatSaturatedG() {
		return fatSaturatedG;
	}

	public void setFatSaturatedG(BigDecimal fatSaturatedG) {
		this.fatSaturatedG = fatSaturatedG;
	}

	public BigDecimal getFatUnsaturatedG() {
		return fatUnsaturatedG;
	}

	public void setFatUnsaturatedG(BigDecimal fatUnsaturatedG) {
		this.fatUnsaturatedG = fatUnsaturatedG;
	}

	public BigDecimal getFatTransG() {
		return fatTransG;
	}

	public void setFatTransG(BigDecimal fatTransG) {
		this.fatTransG = fatTransG;
	}

	public BigDecimal getCarbsG() {
		return carbsG;
	}

	public void setCarbsG(BigDecimal carbsG) {
		this.carbsG = carbsG;
	}

	public BigDecimal getCarbsSugarsG() {
		return carbsSugarsG;
	}

	public void setCarbsSugarsG(BigDecimal carbsSugarsG) {
		this.carbsSugarsG = carbsSugarsG;
	}

	public BigDecimal getCarbsComplexG() {
		return carbsComplexG;
	}

	public void setCarbsComplexG(BigDecimal carbsComplexG) {
		this.carbsComplexG = carbsComplexG;
	}

	public BigDecimal getCarbsFiberG() {
		return carbsFiberG;
	}

	public void setCarbsFiberG(BigDecimal carbsFiberG) {
		this.carbsFiberG = carbsFiberG;
	}

	public BigDecimal getProteinG() {
		return proteinG;
	}

	public void setProteinG(BigDecimal proteinG) {
		this.proteinG = proteinG;
	}

	public BigDecimal getSaltG() {
		return saltG;
	}

	public void setSaltG(BigDecimal saltG) {
		this.saltG = saltG;
	}

	public BigDecimal getSodiumG() {
		return sodiumG;
	}

	public void setSodiumG(BigDecimal sodiumG) {
		this.sodiumG = sodiumG;
	}

	public BigDecimal getChlorideG() {
		return chlorideG;
	}

	public void setChlorideG(BigDecimal chlorideG) {
		this.chlorideG = chlorideG;
	}

	public BigDecimal getShelfRoomAmount() {
		return shelfRoomAmount;
	}

	public String getShelfRoomUnit() {
		return shelfRoomUnit;
	}

	public void setShelfRoom(BigDecimal amount, String unit) {
		this.shelfRoomAmount = amount;
		this.shelfRoomUnit = unit;
	}

	public BigDecimal getShelfFridgeAmount() {
		return shelfFridgeAmount;
	}

	public String getShelfFridgeUnit() {
		return shelfFridgeUnit;
	}

	public void setShelfFridge(BigDecimal amount, String unit) {
		this.shelfFridgeAmount = amount;
		this.shelfFridgeUnit = unit;
	}

	public BigDecimal getShelfFreezerAmount() {
		return shelfFreezerAmount;
	}

	public String getShelfFreezerUnit() {
		return shelfFreezerUnit;
	}

	public void setShelfFreezer(BigDecimal amount, String unit) {
		this.shelfFreezerAmount = amount;
		this.shelfFreezerUnit = unit;
	}

	public BigDecimal getShelfAfterOpeningAmount() {
		return shelfAfterOpeningAmount;
	}

	public String getShelfAfterOpeningUnit() {
		return shelfAfterOpeningUnit;
	}

	public void setShelfAfterOpening(BigDecimal amount, String unit) {
		this.shelfAfterOpeningAmount = amount;
		this.shelfAfterOpeningUnit = unit;
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
