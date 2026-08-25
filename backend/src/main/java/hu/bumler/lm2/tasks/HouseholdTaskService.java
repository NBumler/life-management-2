package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.HouseholdTask;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class HouseholdTaskService {

	private final HouseholdTaskRepository repository;
	private final HouseholdRoomRepository roomRepository;
	private final HouseholdTaskMapper mapper;

	HouseholdTaskService(HouseholdTaskRepository repository, HouseholdRoomRepository roomRepository, HouseholdTaskMapper mapper) {
		this.repository = repository;
		this.roomRepository = roomRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<HouseholdTask> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNextDueAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	HouseholdTask get(UUID userId, UUID id) {
		HouseholdTaskEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such task"));
		return mapper.toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert").
	 * A multi-room create on the client is N independent calls to this, one per room.
	 */
	@Transactional
	HouseholdTask create(UUID userId, HouseholdTask dto) {
		HouseholdTaskEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new HouseholdTaskEntity(dto.getId(), userId));
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Full replace, including "pipálás" (the client rolls nextDue / lastCompletedAt forward, this just stores it). */
	@Transactional
	HouseholdTask update(UUID userId, UUID id, HouseholdTask dto) {
		HouseholdTaskEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such task"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Task already deleted");
		}
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. The room itself is untouched (documentation/Subfeatures/Háztartási feladatok.md). */
	@Transactional
	HouseholdTask delete(UUID userId, UUID id) {
		HouseholdTaskEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such task"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(HouseholdTaskEntity entity, UUID userId, HouseholdTask dto) {
		requireOwnRoom(userId, dto.getRoomId());
		applyName(entity, dto.getRoomId(), dto.getName());
		entity.setRoomId(dto.getRoomId());
		entity.setEnergyLevel(dto.getEnergyLevel().getValue());
		entity.setEstimatedMinutes(dto.getEstimatedMinutes());
		entity.setIntervalDays(dto.getIntervalDays());
		entity.setNextDue(dto.getNextDue());
		entity.setLastCompletedAt(dto.getLastCompletedAt().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
	}

	/** documentation/Subfeatures/Háztartási feladatok.md: a task may only reference the caller's own room. */
	private void requireOwnRoom(UUID userId, UUID roomId) {
		if (roomRepository.findByIdAndUserId(roomId, userId).isEmpty()) {
			throw new EntityNotFoundException("No such room");
		}
	}

	/**
	 * documentation/Architektúra/Névegyediség.md: scope is the room, not the user — moving a task to
	 * another room re-checks uniqueness against the *target* room.
	 */
	private void applyName(HouseholdTaskEntity entity, UUID roomId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByRoomIdAndNameNormalizedAndDeletedFalse(roomId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static HouseholdTaskEntity requireOwner(HouseholdTaskEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such task");
		}
		return entity;
	}
}
