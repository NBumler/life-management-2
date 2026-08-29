package hu.bumler.lm2.climbing;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.BoulderProblem;

@Component
class BoulderProblemMapper {

	BoulderProblem toDto(BoulderProblemEntity entity) {
		BoulderProblem dto = new BoulderProblem(entity.getId(), entity.getSectorId(), entity.getName(),
				entity.getGuidebookGrade(), entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
