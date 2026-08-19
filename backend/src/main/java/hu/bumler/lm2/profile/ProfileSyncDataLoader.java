package hu.bumler.lm2.profile;

import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.common.sync.SyncedEntityDataLoader;

@Component
class ProfileSyncDataLoader implements SyncedEntityDataLoader {

	private final ProfileRepository repository;
	private final ProfileMapper mapper;

	ProfileSyncDataLoader(ProfileRepository repository, ProfileMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Override
	public String entityType() {
		return "UserProfile";
	}

	@Override
	public Map<UUID, Object> loadByIds(Collection<UUID> ids) {
		return repository.findAllById(ids).stream()
				.collect(Collectors.toMap(ProfileEntity::getId, mapper::toDto));
	}
}
