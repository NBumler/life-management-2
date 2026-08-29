package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.IndoorRoute;

@Component
class IndoorRouteMapper {

	IndoorRoute toDto(IndoorRouteEntity entity) {
		IndoorRoute dto = new IndoorRoute(entity.getId(), entity.getGymId(), entity.getName(),
				IndoorRoute.DisciplineEnum.fromValue(entity.getDiscipline()), entity.getGrade(),
				entity.getAbsoluteDifficultyIndex(), entity.isDeleted());
		dto.sector(entity.getSector());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
