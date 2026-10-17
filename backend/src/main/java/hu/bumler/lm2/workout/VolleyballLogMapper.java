package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.VolleyballLog;

@Component
class VolleyballLogMapper {

	VolleyballLog toDto(VolleyballLogEntity entity) {
		VolleyballLog dto = new VolleyballLog(entity.getId(), entity.getVolleyballDate(), entity.getDurationMinutes(),
				entity.isDeleted());
		dto.intensity(entity.getIntensity() == null ? null : VolleyballLog.IntensityEnum.fromValue(entity.getIntensity()));
		dto.setsPlayed(entity.getSetsPlayed());
		dto.notes(entity.getNotes());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
