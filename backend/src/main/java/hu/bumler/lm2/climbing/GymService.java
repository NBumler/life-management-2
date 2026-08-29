package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Gym;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/**
 * documentation/Subfeatures/Indoor boulder admin.md — flat, user-owned gym master CRUD (mirrors
 * {@code ExerciseService}: idempotent upsert on the client id, cross-user rows refused as 404,
 * live-row-scoped name uniqueness with the conflicting id). Colour bands and indoor routes are
 * separate resources — nothing cascades from a gym soft-delete here.
 */
@Service
class GymService {

	private final GymRepository repository;
	private final GymMapper mapper;

	GymService(GymRepository repository, GymMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Gym> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Gym get(UUID userId, UUID id) {
		GymEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such gym"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Gym create(UUID userId, Gym dto) {
		GymEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new GymEntity(dto.getId(), userId));
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Gym update(UUID userId, UUID id, Gym dto) {
		GymEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such gym"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Gym already deleted");
		}
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	Gym delete(UUID userId, UUID id) {
		GymEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such gym"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(GymEntity entity, Gym dto) {
		entity.setAddress(dto.getAddress().orElse(null));
		entity.setDisciplines(dto.getDisciplines().stream().map(Gym.DisciplinesEnum::getValue).toList());
		entity.setDefaultWallHeightMeters(dto.getDefaultWallHeightMeters().orElse(null));
		List<Gym.AvailableSafetyStylesEnum> safetyStyles = dto.getAvailableSafetyStyles().orElse(null);
		entity.setAvailableSafetyStyles(
				safetyStyles == null ? null : safetyStyles.stream().map(Gym.AvailableSafetyStylesEnum::getValue).toList());
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: the client pre-checks against its local store, so a
	 * 409 here only fires on a genuine multi-device race — but it must still fire, carrying the
	 * conflicting live row's id (ApiError.conflictingId).
	 */
	private void applyName(GymEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static GymEntity requireOwner(GymEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such gym");
		}
		return entity;
	}
}
