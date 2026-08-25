package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.HouseholdRoom;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

@Service
class HouseholdRoomService {

	private final HouseholdRoomRepository repository;
	private final HouseholdTaskRepository taskRepository;
	private final HouseholdRoomMapper mapper;

	HouseholdRoomService(HouseholdRoomRepository repository, HouseholdTaskRepository taskRepository, HouseholdRoomMapper mapper) {
		this.repository = repository;
		this.taskRepository = taskRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<HouseholdRoom> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderBySortOrderAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	HouseholdRoom get(UUID userId, UUID id) {
		HouseholdRoomEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such room"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	HouseholdRoom create(UUID userId, HouseholdRoom dto) {
		HouseholdRoomEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new HouseholdRoomEntity(dto.getId(), userId));
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	HouseholdRoom update(UUID userId, UUID id, HouseholdRoom dto) {
		HouseholdRoomEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such room"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Room already deleted");
		}
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/**
	 * Soft delete, idempotent, cascading to every live HouseholdTask in this room
	 * (documentation/Subfeatures/Háztartási feladatok.md "Törlés").
	 */
	@Transactional
	HouseholdRoom delete(UUID userId, UUID id) {
		HouseholdRoomEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such room"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (HouseholdTaskEntity task : taskRepository.findByRoomIdAndDeletedFalse(id)) {
				task.softDelete();
				taskRepository.save(task);
			}
			taskRepository.flush();
		}
		return mapper.toDto(entity);
	}

	private void applyFields(HouseholdRoomEntity entity, UUID userId, HouseholdRoom dto) {
		applyName(entity, userId, dto.getName());
		entity.setSortOrder(dto.getSortOrder());
	}

	/** documentation/Architektúra/Névegyediség.md — same pre-check pattern as GearItemService. */
	private void applyName(HouseholdRoomEntity entity, UUID userId, String name) {
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
	}

	private static HouseholdRoomEntity requireOwner(HouseholdRoomEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such room");
		}
		return entity;
	}
}
