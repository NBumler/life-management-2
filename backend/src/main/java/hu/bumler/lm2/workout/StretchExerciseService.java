package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.StretchExercise;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class StretchExerciseService {

	private final StretchExerciseRepository repository;
	private final StretchExerciseMapper mapper;

	StretchExerciseService(StretchExerciseRepository repository, StretchExerciseMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<StretchExercise> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	StretchExercise get(UUID userId, UUID id) {
		StretchExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretching exercise"));
		return mapper.toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert").
	 * A row found by id but owned by a different user is refused (404, not silently overwritten).
	 */
	@Transactional
	StretchExercise create(UUID userId, StretchExercise dto) {
		StretchExerciseEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new StretchExerciseEntity(dto.getId(), userId));
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	StretchExercise update(UUID userId, UUID id, StretchExercise dto) {
		StretchExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretching exercise"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Stretching exercise already deleted");
		}
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * Soft delete, idempotent. Stretch-plan items snapshot the name / category, so nothing to cascade
	 * here (documentation/Subfeatures/Gyakorlat.md).
	 */
	@Transactional
	StretchExercise delete(UUID userId, UUID id) {
		StretchExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretching exercise"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(StretchExerciseEntity entity, StretchExercise dto) {
		entity.setCategory(dto.getCategory().getValue());
		entity.setDescription(dto.getDescription().orElse(null));
		entity.setEquipment(dto.getEquipment().orElse(null));
		entity.setFavorite(Boolean.TRUE.equals(dto.getIsFavorite()));
		entity.setDefaultHoldSeconds(dto.getDefaultHoldSeconds());
		entity.setDefaultPerSide(Boolean.TRUE.equals(dto.getDefaultPerSide()));
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: the client already pre-checks this against its
	 * local store before saving, so a 409 here only fires on a genuine multi-device race — but it
	 * must still fire, with the conflicting live row's id, so the client can offer "this already
	 * exists, open it?" (ApiError.conflictingId).
	 */
	private void applyName(StretchExerciseEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static StretchExerciseEntity requireOwner(StretchExerciseEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such stretching exercise");
		}
		return entity;
	}
}
