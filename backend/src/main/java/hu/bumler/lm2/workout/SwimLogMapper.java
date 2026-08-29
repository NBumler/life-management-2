package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.SwimLog;

@Component
class SwimLogMapper {

	SwimLog toDto(SwimLogEntity entity) {
		SwimLog dto = new SwimLog(entity.getId(), entity.getSwimDate(), entity.getDurationMinutes(),
				SwimLog.IntensityEnum.fromValue(entity.getIntensity()), entity.isDeleted());
		dto.poolLengthMeters(entity.getPoolLengthMeters());
		dto.lapCount(entity.getLapCount());
		dto.distanceMeters(entity.getDistanceMeters());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
