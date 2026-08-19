package hu.bumler.lm2.profile;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.UserProfile;

/** Manual DTO <-> entity mapping (starter kit convention — no MapStruct unless it pays off). */
@Component
class ProfileMapper {

	UserProfile toDto(ProfileEntity entity) {
		UserProfile dto = new UserProfile(entity.getId());
		if (entity.getBirthDate() != null) {
			dto.birthDate(entity.getBirthDate());
		}
		if (entity.getSex() != null) {
			dto.sex(UserProfile.SexEnum.fromValue(entity.getSex()));
		}
		if (entity.getHeightCm() != null) {
			dto.heightCm(entity.getHeightCm());
		}
		if (entity.getCurrentWeightKg() != null) {
			dto.currentWeightKg(entity.getCurrentWeightKg());
		}
		if (entity.getGoal() != null) {
			dto.goal(UserProfile.GoalEnum.fromValue(entity.getGoal()));
		}
		if (entity.getKgPerWeek() != null) {
			dto.kgPerWeek(entity.getKgPerWeek());
		}
		if (entity.getGrossMonthlySalaryHuf() != null) {
			dto.grossMonthlySalaryHuf(entity.getGrossMonthlySalaryHuf());
		}
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}

	/** PUT is a full-body replace (documentation/Architektúra/Backend-offline first.md), so every field is applied. */
	void applyTo(ProfileEntity entity, UserProfile dto) {
		entity.setBirthDate(dto.getBirthDate().orElse(null));
		UserProfile.SexEnum sex = dto.getSex().orElse(null);
		entity.setSex(sex == null ? null : sex.getValue());
		entity.setHeightCm(dto.getHeightCm().orElse(null));
		entity.setCurrentWeightKg(dto.getCurrentWeightKg().orElse(null));
		UserProfile.GoalEnum goal = dto.getGoal().orElse(null);
		entity.setGoal(goal == null ? null : goal.getValue());
		entity.setKgPerWeek(dto.getKgPerWeek().orElse(null));
		entity.setGrossMonthlySalaryHuf(dto.getGrossMonthlySalaryHuf().orElse(null));
	}
}
