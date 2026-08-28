package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class WeeklyPlanSyncDataLoader implements SyncedEntityDataLoader {

	private final WeeklyPlanRepository repository;
	private final WeeklyPlanSlotRepository slotRepository;
	private final WeeklyPlanMapper mapper;
	private final WeeklyPlanSlotMapper slotMapper;

	WeeklyPlanSyncDataLoader(WeeklyPlanRepository repository, WeeklyPlanSlotRepository slotRepository, WeeklyPlanMapper mapper,
			WeeklyPlanSlotMapper slotMapper) {
		this.repository = repository;
		this.slotRepository = slotRepository;
		this.mapper = mapper;
		this.slotMapper = slotMapper;
	}

	@Override
	public String entityType() {
		return "WeeklyPlan";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<WeeklyPlanEntity> plans = repository.findAllById(ids);
		Map<UUID, List<WeeklyPlanSlotEntity>> slotsByPlan = slotRepository
				.findByWeeklyPlanIdIn(plans.stream().map(WeeklyPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(WeeklyPlanSlotEntity::getWeeklyPlanId));
		return plans.stream().collect(Collectors.toMap(WeeklyPlanEntity::getId, plan -> mapper.toDto(plan,
				slotsByPlan.getOrDefault(plan.getId(), List.of()).stream().map(slotMapper::toDto).toList())));
	}
}
