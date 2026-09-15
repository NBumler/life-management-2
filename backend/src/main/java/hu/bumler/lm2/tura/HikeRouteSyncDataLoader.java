package hu.bumler.lm2.tura;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class HikeRouteSyncDataLoader implements SyncedEntityDataLoader {

	private final HikeRouteRepository repository;
	private final HikeRouteMapper mapper;

	HikeRouteSyncDataLoader(HikeRouteRepository repository, HikeRouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "HikeRoute";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream().collect(Collectors.toMap(HikeRouteEntity::getId, mapper::toDto));
	}
}
