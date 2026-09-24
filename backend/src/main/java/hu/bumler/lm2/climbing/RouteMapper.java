package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Route;

@Component
class RouteMapper {

	Route toDto(RouteEntity entity) {
		Route dto = new Route(entity.getId(), entity.getSectorId(), entity.getName(), entity.getGuidebookGrade(),
				entity.isDeleted());
		dto.lengthInMeters(entity.getLengthInMeters());
		dto.totalPitches(entity.getTotalPitches());
		dto.rockType(entity.getRockType());
		if (entity.getAspect() != null) {
			dto.aspect(Route.AspectEnum.fromValue(entity.getAspect()));
		}
		dto.topoNumber(entity.getTopoNumber());
		if (entity.getProtectionType() != null) {
			dto.protectionType(Route.ProtectionTypeEnum.fromValue(entity.getProtectionType()));
		}
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
