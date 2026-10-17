package hu.bumler.lm2.workout;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class StretchPlanSyncDataLoader implements SyncedEntityDataLoader {

	private final StretchPlanRepository repository;
	private final StretchPlanItemRepository itemRepository;
	private final StretchPlanMapper mapper;

	StretchPlanSyncDataLoader(StretchPlanRepository repository, StretchPlanItemRepository itemRepository, StretchPlanMapper mapper) {
		this.repository = repository;
		this.itemRepository = itemRepository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "StretchPlan";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		List<StretchPlanEntity> plans = repository.findAllById(ids);
		Map<UUID, List<StretchPlanItemEntity>> itemsByPlan = itemRepository
				.findByPlanIdIn(plans.stream().map(StretchPlanEntity::getId).toList()).stream()
				.collect(Collectors.groupingBy(StretchPlanItemEntity::getPlanId));
		return plans.stream().collect(Collectors.toMap(StretchPlanEntity::getId, plan -> mapper.toDto(plan,
				itemsByPlan.getOrDefault(plan.getId(), List.of()).stream().map(mapper::toDto).toList())));
	}
}
