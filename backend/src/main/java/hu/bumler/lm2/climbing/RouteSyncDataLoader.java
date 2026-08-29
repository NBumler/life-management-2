package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class RouteSyncDataLoader implements SyncedEntityDataLoader {

	private final RouteRepository repository;
	private final RouteMapper mapper;

	RouteSyncDataLoader(RouteRepository repository, RouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "Route";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(RouteEntity::getId, mapper::toDto));
	}
}
