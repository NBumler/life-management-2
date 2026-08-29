package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Crag;

@Component
class CragMapper {

	Crag toDto(CragEntity entity) {
		Crag dto = new Crag(entity.getId(), entity.getName(), entity.isDeleted());
		dto.latitude(entity.getLatitude());
		dto.longitude(entity.getLongitude());
		dto.defaultRockType(entity.getDefaultRockType());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
