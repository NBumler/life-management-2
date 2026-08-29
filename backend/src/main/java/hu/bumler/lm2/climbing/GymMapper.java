package hu.bumler.lm2.climbing;

import java.util.List;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.Gym;

@Component
class GymMapper {

	Gym toDto(GymEntity entity) {
		Gym dto = new Gym(entity.getId(), entity.getName(), toDisciplineEnums(entity.getDisciplines()),
				entity.isDeleted());
		dto.address(entity.getAddress());
		dto.defaultWallHeightMeters(entity.getDefaultWallHeightMeters());
		dto.availableSafetyStyles(toSafetyStyleEnums(entity.getAvailableSafetyStyles()));
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	private static List<Gym.DisciplinesEnum> toDisciplineEnums(List<String> values) {
		return values.stream().map(Gym.DisciplinesEnum::fromValue).toList();
	}

	private static List<Gym.AvailableSafetyStylesEnum> toSafetyStyleEnums(List<String> values) {
		return values == null ? null : values.stream().map(Gym.AvailableSafetyStylesEnum::fromValue).toList();
	}
}
