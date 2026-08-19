package hu.bumler.lm2.profile;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.UserProfile;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

@Service
class ProfileService {

	private final ProfileRepository repository;
	private final ProfileMapper mapper;

	ProfileService(ProfileRepository repository, ProfileMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	UserProfile get(UUID userId) {
		ProfileEntity entity = repository.findByUserId(userId)
				.orElseThrow(() -> new EntityNotFoundException("No profile saved yet"));
		return mapper.toDto(entity);
	}

	/** Upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	UserProfile upsert(UUID userId, UserProfile dto) {
		validate(dto);
		ProfileEntity entity = repository.findById(dto.getId())
				.orElseGet(() -> new ProfileEntity(dto.getId(), userId));
		mapper.applyTo(entity, dto);
		// flush, not save: the DB trigger sets updated_at, and Hibernate only reads @Generated
		// values back once the statement has actually been sent.
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	private void validate(UserProfile dto) {
		UserProfile.GoalEnum goal = dto.getGoal().orElse(null);
		BigDecimal kgPerWeek = dto.getKgPerWeek().orElse(null);
		boolean kgPerWeekRequired = goal == UserProfile.GoalEnum.FAT_LOSS
				|| goal == UserProfile.GoalEnum.WEIGHT_GAIN;
		if (kgPerWeekRequired && kgPerWeek == null) {
			throw new ValidationException("kgPerWeek is required when goal is " + goal, "kgPerWeek");
		}
	}
}
