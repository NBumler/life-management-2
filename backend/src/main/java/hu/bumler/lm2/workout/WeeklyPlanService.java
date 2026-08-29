package hu.bumler.lm2.workout;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.WeeklyPlan;
import hu.bumler.lm2.api.model.WeeklyPlanSlot;
import hu.bumler.lm2.common.NestedChildResolver;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Heti terv.md — per-user weekly assignment of templates to days. Nested
 * aggregate PUT like {@link WorkoutSessionService} but only two levels deep: WeeklyPlan →
 * WeeklyPlanSlot. {@code id} is a deterministic client UUID v5 of (userId, weekStartDate); a POST for
 * an already-existing (or soft-deleted) week resolves to / revives that week's row.
 */
@Service
class WeeklyPlanService {

	private final WeeklyPlanRepository repository;
	private final WeeklyPlanSlotRepository slotRepository;
	private final WeeklyPlanMapper mapper;
	private final WeeklyPlanSlotMapper slotMapper;

	WeeklyPlanService(WeeklyPlanRepository repository, WeeklyPlanSlotRepository slotRepository, WeeklyPlanMapper mapper,
			WeeklyPlanSlotMapper slotMapper) {
		this.repository = repository;
		this.slotRepository = slotRepository;
		this.mapper = mapper;
		this.slotMapper = slotMapper;
	}

	@Transactional(readOnly = true)
	List<WeeklyPlan> list(UUID userId) {
		List<WeeklyPlanEntity> plans = repository.findByUserIdAndDeletedFalseOrderByWeekStartDateDesc(userId);
		Map<UUID, List<WeeklyPlanSlotEntity>> slotsByPlan = slotRepository
				.findByWeeklyPlanIdIn(plans.stream().map(WeeklyPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WeeklyPlanSlotEntity::getWeeklyPlanId));
		return plans.stream().map(plan -> toDto(plan, slotsByPlan.getOrDefault(plan.getId(), List.of()))).toList();
	}

	@Transactional(readOnly = true)
	WeeklyPlan get(UUID userId, UUID id) {
		WeeklyPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such weekly plan"));
		return toDto(entity);
	}

	/**
	 * Idempotent upsert on the client-supplied id; a tombstoned row for the same week is revived —
	 * required, not just convenient, because the id is a deterministic v5 of (userId, weekStartDate)
	 * and so cannot be re-minted for a fresh row. Contrast {@link WorkoutSessionService#create}.
	 */
	@Transactional
	WeeklyPlan create(UUID userId, WeeklyPlan dto) {
		WeeklyPlanEntity entity = repository.findById(dto.getId()).map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new WeeklyPlanEntity(dto.getId(), userId));
		if (entity.isDeleted()) {
			entity.undelete();
		}
		return saveTree(entity, dto);
	}

	@Transactional
	WeeklyPlan update(UUID userId, UUID id, WeeklyPlan dto) {
		WeeklyPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such weekly plan"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Weekly plan already deleted");
		}
		return saveTree(entity, dto);
	}

	/** Soft delete, idempotent, cascading to every live day slot on the weekly plan. */
	@Transactional
	WeeklyPlan delete(UUID userId, UUID id) {
		WeeklyPlanEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such weekly plan"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (WeeklyPlanSlotEntity slot : slotRepository.findByWeeklyPlanIdAndDeletedFalse(id)) {
				slot.softDelete();
				slotRepository.save(slot);
			}
			slotRepository.flush();
		}
		return toDto(entity);
	}

	/**
	 * documentation/Architektúra/Backend.md "Nested aggregate PUT": the incoming {@code slots} list is
	 * the complete desired live set — slots missing from it are soft-deleted; the response always
	 * lists every row, live or tombstoned (WeeklyPlan.yaml).
	 */
	private WeeklyPlan saveTree(WeeklyPlanEntity entity, WeeklyPlan dto) {
		entity.setWeekStartDate(dto.getWeekStartDate());
		repository.saveAndFlush(entity);

		List<WeeklyPlanSlotEntity> existingSlots = slotRepository.findByWeeklyPlanId(entity.getId());
		Set<UUID> incomingSlotIds = new HashSet<>();
		for (WeeklyPlanSlot slotDto : dto.getSlots()) {
			if (slotDto.getDeleted()) {
				continue;
			}
			incomingSlotIds.add(slotDto.getId());
			WeeklyPlanSlotEntity slotEntity = resolveSlot(entity.getId(), existingSlots, slotDto.getId());
			slotEntity.setDayOfWeek(slotDto.getDayOfWeek().getValue());
			slotEntity.setPlanId(slotDto.getPlanId());
			slotRepository.save(slotEntity);
		}
		for (WeeklyPlanSlotEntity existing : existingSlots) {
			if (!existing.isDeleted() && !incomingSlotIds.contains(existing.getId())) {
				existing.softDelete();
				slotRepository.save(existing);
			}
		}
		slotRepository.flush();

		return toDto(entity);
	}

	/** See {@link NestedChildResolver} — shared with MealService.resolveItem etc. */
	private WeeklyPlanSlotEntity resolveSlot(UUID weeklyPlanId, List<WeeklyPlanSlotEntity> existing, UUID id) {
		return NestedChildResolver.resolve(id, existing, WeeklyPlanSlotEntity::getId, WeeklyPlanSlotEntity::isDeleted,
				WeeklyPlanSlotEntity::undelete, slotRepository::existsById,
				() -> new WeeklyPlanSlotEntity(id, weeklyPlanId), "No such weekly plan slot");
	}

	private WeeklyPlan toDto(WeeklyPlanEntity entity) {
		return toDto(entity, slotRepository.findByWeeklyPlanId(entity.getId()));
	}

	private WeeklyPlan toDto(WeeklyPlanEntity entity, List<WeeklyPlanSlotEntity> slots) {
		return mapper.toDto(entity, slots.stream().map(slotMapper::toDto).toList());
	}

	private static WeeklyPlanEntity requireOwner(WeeklyPlanEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such weekly plan");
		}
		return entity;
	}
}
