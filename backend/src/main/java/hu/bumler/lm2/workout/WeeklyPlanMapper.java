package hu.bumler.lm2.workout;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.WeeklyPlan;
import hu.bumler.lm2.api.model.WeeklyPlanSlot;

@Component
class WeeklyPlanMapper {

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": {@code slots} lists every row for
	 * this weekly plan, live or tombstoned — see WeeklyPlan.yaml for why.
	 */
	WeeklyPlan toDto(WeeklyPlanEntity entity, List<WeeklyPlanSlot> slots) {
		WeeklyPlan dto = new WeeklyPlan(entity.getId(), entity.getWeekStartDate(), slots, entity.isDeleted());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
