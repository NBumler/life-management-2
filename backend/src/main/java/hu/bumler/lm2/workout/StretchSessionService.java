package hu.bumler.lm2.workout;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.StretchSession;
import hu.bumler.lm2.api.model.StretchSessionItem;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Nyújtás.md (backlog/169) — per-user stretching sessions. Nested aggregate PUT
 * like {@link StretchPlanService}: StretchSession → StretchSessionItem in one {@code @Transactional}
 * method whose response echoes every row. {@code stretchPlanId} / {@code workoutSessionId} must be the
 * caller's own rows (404 otherwise, never 403).
 */
@Service
class StretchSessionService {

	private final StretchSessionRepository repository;
	private final StretchSessionItemRepository itemRepository;
	private final StretchSessionMapper mapper;
	private final StretchPlanRepository stretchPlanRepository;
	private final WorkoutSessionRepository workoutSessionRepository;

	StretchSessionService(StretchSessionRepository repository, StretchSessionItemRepository itemRepository, StretchSessionMapper mapper,
			StretchPlanRepository stretchPlanRepository, WorkoutSessionRepository workoutSessionRepository) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
		this.stretchPlanRepository = stretchPlanRepository;
		this.workoutSessionRepository = workoutSessionRepository;
	}

	@Transactional(readOnly = true)
	List<StretchSession> list(UUID userId) {
		List<StretchSessionEntity> sessions = repository.findByUserIdAndDeletedFalseOrderByDateDescCreatedAtDesc(userId);
		Map<UUID, List<StretchSessionItemEntity>> itemsBySession = itemRepository
				.findBySessionIdIn(sessions.stream().map(StretchSessionEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(StretchSessionItemEntity::getSessionId));
		return sessions.stream().map(session -> toDto(session, itemsBySession.getOrDefault(session.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	StretchSession get(UUID userId, UUID id) {
		StretchSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch session"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id; a tombstoned session stays deleted (like WorkoutSession). */
	@Transactional
	StretchSession create(UUID userId, StretchSession dto) {
		StretchSessionEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new StretchSessionEntity(dto.getId(), userId));
		if (entity.isDeleted()) {
			return toDto(entity);
		}
		return saveTree(userId, entity, dto);
	}

	@Transactional
	StretchSession update(UUID userId, UUID id, StretchSession dto) {
		StretchSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch session"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Stretch session already deleted");
		}
		return saveTree(userId, entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live item. */
	@Transactional
	StretchSession delete(UUID userId, UUID id) {
		StretchSessionEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch session"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (StretchSessionItemEntity item : itemRepository.findBySessionIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDto(entity);
	}

	private StretchSession saveTree(UUID userId, StretchSessionEntity entity, StretchSession dto) {
		UUID stretchPlanId = dto.getStretchPlanId().orElse(null);
		if (stretchPlanId != null) {
			stretchPlanRepository.findByIdAndUserId(stretchPlanId, userId)
					.orElseThrow(() -> new EntityNotFoundException("No such stretch plan"));
		}
		UUID workoutSessionId = dto.getWorkoutSessionId().orElse(null);
		if (workoutSessionId != null) {
			workoutSessionRepository.findByIdAndUserId(workoutSessionId, userId)
					.orElseThrow(() -> new EntityNotFoundException("No such workout session"));
		}
		entity.setDate(dto.getDate());
		entity.setStartTime(dto.getStartTime().orElse(null));
		entity.setEndTime(dto.getEndTime().orElse(null));
		entity.setDurationMinutes(dto.getDurationMinutes());
		entity.setStretchPlanId(stretchPlanId);
		entity.setWorkoutSessionId(workoutSessionId);
		entity.setNotes(dto.getNotes().orElse(null));
		repository.saveAndFlush(entity);

		List<StretchSessionItemEntity> existingItems = itemRepository.findBySessionId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		for (StretchSessionItem itemDto : dto.getItems()) {
			if (itemDto.getDeleted()) {
				continue;
			}
			incomingIds.add(itemDto.getId());
			StretchSessionItemEntity itemEntity = resolveItem(entity.getId(), existingItems, itemDto.getId());
			itemEntity.setStretchExerciseId(itemDto.getStretchExerciseId().orElse(null));
			itemEntity.setStretchName(itemDto.getStretchName());
			itemEntity.setStretchCategory(itemDto.getStretchCategory().getValue());
			itemEntity.setOrderIndex(itemDto.getOrderIndex());
			itemEntity.setHoldSeconds(itemDto.getHoldSeconds());
			itemEntity.setPerSide(Boolean.TRUE.equals(itemDto.getPerSide()));
			itemEntity.setRepetitions(itemDto.getRepetitions());
			itemEntity.setCompleted(Boolean.TRUE.equals(itemDto.getCompleted()));
			itemRepository.save(itemEntity);
		}
		for (StretchSessionItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with StretchPlanService.resolveItem etc. */
	private StretchSessionItemEntity resolveItem(UUID sessionId, List<StretchSessionItemEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, StretchSessionItemEntity::getId, StretchSessionItemEntity::isDeleted,
				StretchSessionItemEntity::undelete, itemRepository::existsById, () -> new StretchSessionItemEntity(id, sessionId),
				"No such stretch session item");
	}

	private StretchSession toDto(StretchSessionEntity entity) {
		return toDto(entity, itemRepository.findBySessionId(entity.getId()));
	}

	private StretchSession toDto(StretchSessionEntity entity, List<StretchSessionItemEntity> items) {
		return mapper.toDto(entity, items.stream().map(mapper::toDto).toList());
	}

	private static StretchSessionEntity requireOwner(StretchSessionEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such stretch session");
		}
		return entity;
	}
}
