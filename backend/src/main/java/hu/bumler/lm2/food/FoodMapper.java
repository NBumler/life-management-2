package hu.bumler.lm2.food;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Food;

@Component
class FoodMapper {

	Food toDto(FoodEntity entity) {
		Food dto = new Food(entity.getId(), entity.getName(), entity.isDeleted());
		dto.store(entity.getStore());
		dto.brand(entity.getBrand());
		dto.barcode(entity.getBarcode());
		dto.note(entity.getNote());
		dto.priceHuf(entity.getPriceHuf());
		dto.netAmount(entity.getNetAmount());
		dto.netUnit(entity.getNetUnit());
		dto.pieceAmount(entity.getPieceAmount());
		dto.pieceUnit(entity.getPieceUnit());
		dto.energyKcal(entity.getEnergyKcal());
		dto.fatG(entity.getFatG());
		dto.fatSaturatedG(entity.getFatSaturatedG());
		dto.fatUnsaturatedG(entity.getFatUnsaturatedG());
		dto.fatTransG(entity.getFatTransG());
		dto.carbsG(entity.getCarbsG());
		dto.carbsSugarsG(entity.getCarbsSugarsG());
		dto.carbsComplexG(entity.getCarbsComplexG());
		dto.carbsFiberG(entity.getCarbsFiberG());
		dto.proteinG(entity.getProteinG());
		dto.saltG(entity.getSaltG());
		dto.sodiumG(entity.getSodiumG());
		dto.chlorideG(entity.getChlorideG());
		dto.shelfRoomAmount(entity.getShelfRoomAmount());
		dto.shelfRoomUnit(entity.getShelfRoomUnit());
		dto.shelfFridgeAmount(entity.getShelfFridgeAmount());
		dto.shelfFridgeUnit(entity.getShelfFridgeUnit());
		dto.shelfFreezerAmount(entity.getShelfFreezerAmount());
		dto.shelfFreezerUnit(entity.getShelfFreezerUnit());
		dto.shelfAfterOpeningAmount(entity.getShelfAfterOpeningAmount());
		dto.shelfAfterOpeningUnit(entity.getShelfAfterOpeningUnit());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
