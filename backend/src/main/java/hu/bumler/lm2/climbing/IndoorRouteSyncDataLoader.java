package hu.bumler.lm2.climbing;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class IndoorRouteSyncDataLoader implements SyncedEntityDataLoader {

	private final IndoorRouteRepository repository;
	private final IndoorRouteMapper mapper;

	IndoorRouteSyncDataLoader(IndoorRouteRepository repository, IndoorRouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "IndoorRoute";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(IndoorRouteEntity::getId, mapper::toDto));
	}
}
