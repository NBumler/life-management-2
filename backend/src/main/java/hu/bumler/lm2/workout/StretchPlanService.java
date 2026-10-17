package hu.bumler.lm2.workout;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.StretchPlan;
import hu.bumler.lm2.api.model.StretchPlanItem;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Heti terv.md "Nyújtó sablonok" (backlog/168) — per-user stretching templates.
 * Nested aggregate PUT like {@link WorkoutPlanService}, two levels deep: StretchPlan → StretchPlanItem,
 * committed atomically in one {@code @Transactional} method whose response echoes every row (live or
 * tombstoned). {@code active} is a plain field on the tree.
 */
@Service
class StretchPlanService {

	private final StretchPlanRepository repository;
	private final StretchPlanItemRepository itemRepository;
	private final StretchPlanMapper mapper;

	StretchPlanService(StretchPlanRepository repository, StretchPlanItemRepository itemRepository, StretchPlanMapper mapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<StretchPlan> list(UUID userId) {
		List<StretchPlanEntity> plans = repository.findByUserIdAndDeletedFalseOrderByCreatedAtAsc(userId);
		Map<UUID, List<StretchPlanItemEntity>> itemsByPlan = itemRepository
				.findByPlanIdIn(plans.stream().map(StretchPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(StretchPlanItemEntity::getPlanId));
		return plans.stream().map(plan -> toDto(plan, itemsByPlan.getOrDefault(plan.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	StretchPlan get(UUID userId, UUID id) {
		StretchPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch plan"));
		return toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id; a tombstoned plan is revived on POST (like WorkoutPlan). */
	@Transactional
	StretchPlan create(UUID userId, StretchPlan dto) {
		StretchPlanEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new StretchPlanEntity(dto.getId(), userId));
		if (entity.isDeleted()) {
			entity.undelete();
		}
		return saveTree(entity, dto);
	}

	@Transactional
	StretchPlan update(UUID userId, UUID id, StretchPlan dto) {
		StretchPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch plan"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Stretch plan already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live item. WeeklyPlan STRETCH slots pointing at it stay. */
	@Transactional
	StretchPlan delete(UUID userId, UUID id) {
		StretchPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such stretch plan"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (StretchPlanItemEntity item : itemRepository.findByPlanIdAndDeletedFalse(id)) {
				item.softDelete();
				itemRepository.save(item);
			}
			itemRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code items} list is the
	 * complete desired live set — rows missing from it are soft-deleted; the response lists every row.
	 */
	private StretchPlan saveTree(StretchPlanEntity entity, StretchPlan dto) {
		entity.setName(dto.getName());
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setActive(Boolean.TRUE.equals(dto.getActive()));
		entity.setGoalLabel(dto.getGoalLabel().orElse(null));
		repository.saveAndFlush(entity);

		List<StretchPlanItemEntity> existingItems = itemRepository.findByPlanId(entity.getId());
		Set<UUID> incomingIds = new HashSet<>();
		for (StretchPlanItem itemDto : dto.getItems()) {
			if (itemDto.getDeleted()) {
				continue;
			}
			incomingIds.add(itemDto.getId());
			StretchPlanItemEntity itemEntity = resolveItem(entity.getId(), existingItems, itemDto.getId());
			itemEntity.setStretchExerciseId(itemDto.getStretchExerciseId());
			itemEntity.setStretchName(itemDto.getStretchName());
			itemEntity.setStretchCategory(itemDto.getStretchCategory().getValue());
			itemEntity.setOrderIndex(itemDto.getOrderIndex());
			itemEntity.setHoldSeconds(itemDto.getHoldSeconds());
			itemEntity.setPerSide(Boolean.TRUE.equals(itemDto.getPerSide()));
			itemEntity.setRepetitions(itemDto.getRepetitions());
			itemEntity.setNotes(itemDto.getNotes().orElse(null));
			itemRepository.save(itemEntity);
		}
		for (StretchPlanItemEntity existing : existingItems) {
			if (!existing.isDeleted() && !incomingIds.contains(existing.getId())) {
				existing.softDelete();
				itemRepository.save(existing);
			}
		}
		itemRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with WorkoutPlanService.resolveExercise etc. */
	private StretchPlanItemEntity resolveItem(UUID planId, List<StretchPlanItemEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, StretchPlanItemEntity::getId, StretchPlanItemEntity::isDeleted,
				StretchPlanItemEntity::undelete, itemRepository::existsById, () -> new StretchPlanItemEntity(id, planId),
				"No such stretch plan item");
	}

	private StretchPlan toDto(StretchPlanEntity entity) {
		return toDto(entity, itemRepository.findByPlanId(entity.getId()));
	}

	private StretchPlan toDto(StretchPlanEntity entity, List<StretchPlanItemEntity> items) {
		return mapper.toDto(entity, items.stream().map(mapper::toDto).toList());
	}

	private static StretchPlanEntity requireOwner(StretchPlanEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such stretch plan");
		}
		return entity;
	}
}
