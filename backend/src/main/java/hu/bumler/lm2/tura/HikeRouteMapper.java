package hu.bumler.lm2.tura;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.HikeRoute;

@Component
class HikeRouteMapper {

	HikeRoute toDto(HikeRouteEntity entity) {
		HikeRoute dto = new HikeRoute(entity.getId(), entity.getName(), TrailSegmentMapper.toPairs(entity.getCoordinates()),
				entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
