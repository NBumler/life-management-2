package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Crag;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Outdoor boulder admin.md — flat, user-owned crag master CRUD (mirrors
 * {@code IndoorRouteService}: idempotent upsert on the client id, cross-user rows refused as 404,
 * soft delete). No name uniqueness — the same crag name may recur. Sectors reference a crag by id;
 * nothing cascades from a crag soft-delete here.
 */
@Service
class CragService {

	private final CragRepository repository;
	private final CragMapper mapper;

	CragService(CragRepository repository, CragMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Crag> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Crag get(UUID userId, UUID id) {
		CragEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such crag"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Crag create(UUID userId, Crag dto) {
		CragEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new CragEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Crag update(UUID userId, UUID id, Crag dto) {
		CragEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such crag"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Crag already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	Crag delete(UUID userId, UUID id) {
		CragEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such crag"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(CragEntity entity, Crag dto) {
		entity.setName(dto.getName());
		entity.setLatitude(dto.getLatitude().orElse(null));
		entity.setLongitude(dto.getLongitude().orElse(null));
		entity.setDefaultRockType(dto.getDefaultRockType().orElse(null));
	}

	private static CragEntity requireOwner(CragEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such crag");
		}
		return entity;
	}
}
