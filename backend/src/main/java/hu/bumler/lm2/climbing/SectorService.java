package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Sector;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Outdoor boulder admin.md — flat, user-owned sector master CRUD (mirrors
 * {@code IndoorRouteService}: idempotent upsert, cross-user 404, soft delete). No name uniqueness.
 * The crag link is fixed at create time.
 */
@Service
class SectorService {

	private final SectorRepository repository;
	private final SectorMapper mapper;

	SectorService(SectorRepository repository, SectorMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Sector> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Sector get(UUID userId, UUID id) {
		SectorEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such sector"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Sector create(UUID userId, Sector dto) {
		SectorEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new SectorEntity(dto.getId(), userId, dto.getCragId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Sector update(UUID userId, UUID id, Sector dto) {
		SectorEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such sector"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Sector already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	Sector delete(UUID userId, UUID id) {
		SectorEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such sector"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(SectorEntity entity, Sector dto) {
		entity.setName(dto.getName());
		entity.setDefaultAspect(dto.getDefaultAspect().orElse(null));
	}

	private static SectorEntity requireOwner(SectorEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such sector");
		}
		return entity;
	}
}
