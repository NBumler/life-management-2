package hu.bumler.lm2.workout;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.BikeRideLog;

@Component
class BikeRideLogMapper {

	BikeRideLog toDto(BikeRideLogEntity entity) {
		BikeRideLog dto = new BikeRideLog(entity.getId(), entity.getRideDate(), entity.getDurationMinutes(),
				BikeRideLog.IntensityEnum.fromValue(entity.getIntensity()), entity.isDeleted());
		dto.distanceKm(entity.getDistanceKm());
		dto.elevationGainMeters(entity.getElevationGainMeters());
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
