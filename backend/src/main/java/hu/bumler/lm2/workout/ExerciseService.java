package hu.bumler.lm2.workout;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class ExerciseService {

	private final ExerciseRepository repository;
	private final ExerciseMapper mapper;

	ExerciseService(ExerciseRepository repository, ExerciseMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Exercise> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Exercise get(UUID userId, UUID id) {
		ExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such exercise"));
		return mapper.toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert").
	 * A row found by id but owned by a different user is refused (404, not silently overwritten).
	 */
	@Transactional
	Exercise create(UUID userId, Exercise dto) {
		ExerciseEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new ExerciseEntity(dto.getId(), userId));
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Exercise update(UUID userId, UUID id, Exercise dto) {
		ExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such exercise"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Exercise already deleted");
		}
		applyName(entity, userId, dto.getName());
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * Soft delete, idempotent. Past Edzésnapló / Heti terv snapshots are untouched
	 * (documentation/Subfeatures/Gyakorlat.md "Törlés") — nothing to cascade here.
	 */
	@Transactional
	Exercise delete(UUID userId, UUID id) {
		ExerciseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such exercise"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(ExerciseEntity entity, Exercise dto) {
		entity.setCategory(dto.getCategory().getValue());
		entity.setKind(dto.getKind().getValue());
		entity.setDefaultRestTimeSeconds(dto.getDefaultRestTimeSeconds().orElse(null));
		entity.setFavorite(Boolean.TRUE.equals(dto.getIsFavorite()));
		entity.setEquipment(dto.getEquipment().orElse(null));
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: the client already pre-checks this against its
	 * local store before saving, so a 409 here only fires on a genuine multi-device race — but it
	 * must still fire, with the conflicting live row's id, so the client can offer "this already
	 * exists, open it?" (ApiError.conflictingId).
	 */
	private void applyName(ExerciseEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static ExerciseEntity requireOwner(ExerciseEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such exercise");
		}
		return entity;
	}
}
