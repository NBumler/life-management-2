package hu.bumler.lm2.tasks;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.HouseholdRoom;

@Component
class HouseholdRoomMapper {

	HouseholdRoom toDto(HouseholdRoomEntity entity) {
		HouseholdRoom dto = new HouseholdRoom(entity.getId(), entity.getName(), entity.getSortOrder(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
