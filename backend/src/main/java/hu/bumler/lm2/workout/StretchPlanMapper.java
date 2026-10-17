package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.StretchPlan;
import hu.bumler.lm2.api.model.StretchPlanItem;

@Component
class StretchPlanMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code items} lists every row for this
	 * plan, live or tombstoned — see StretchPlan.yaml.
	 */
	StretchPlan toDto(StretchPlanEntity entity, List<StretchPlanItem> items) {
		StretchPlan dto = new StretchPlan(entity.getId(), entity.getName(), entity.isActive(), entity.isDeleted(), items);
		dto.notes(entity.getNotes());
		dto.goalLabel(entity.getGoalLabel());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	StretchPlanItem toDto(StretchPlanItemEntity entity) {
		StretchPlanItem dto = new StretchPlanItem(entity.getId(), entity.getPlanId(), entity.getStretchExerciseId(),
				entity.getStretchName(), StretchPlanItem.StretchCategoryEnum.fromValue(entity.getStretchCategory()),
				entity.getOrderIndex(), entity.getHoldSeconds(), entity.isPerSide(), entity.getRepetitions(), entity.isDeleted());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
