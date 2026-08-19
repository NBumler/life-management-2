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

	/**
	 * Upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). The
	 * profile is 1:1 per user (UserProfile is a deterministic-UUID entity, see
	 * Backend-offline-first.md §9), so the lookup is scoped by {@code userId}, never by the raw
	 * {@code dto.getId()} alone — otherwise a client-supplied id colliding with another user's
	 * row would silently overwrite that user's profile.
	 */
	@Transactional
	UserProfile upsert(UUID userId, UserProfile dto) {
		validate(dto);
		ProfileEntity entity = repository.findByUserId(userId).orElseGet(() -> newEntity(dto.getId(), userId));
		mapper.applyTo(entity, dto);
		// flush, not save: the DB trigger sets updated_at, and Hibernate only reads @Generated
		// values back once the statement has actually been sent.
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	private ProfileEntity newEntity(UUID id, UUID userId) {
		// The id is not yet known to belong to this user (no row via findByUserId above). If it
		// already exists as someone else's row, refuse rather than silently adopting it.
		if (repository.existsById(id)) {
			throw new EntityNotFoundException("No profile saved yet");
		}
		return new ProfileEntity(id, userId);
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
