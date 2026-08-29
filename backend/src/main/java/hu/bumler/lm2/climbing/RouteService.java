package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.Route;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Outdoor köteles admin.md — flat, user-owned rope-route master CRUD
 * (mirrors {@code IndoorRouteService}: idempotent upsert, cross-user 404, soft delete). No name
 * uniqueness; the server stores the raw guidebook grade, never recomputes an index. The sector link
 * is fixed at create time.
 */
@Service
class RouteService {

	private final RouteRepository repository;
	private final RouteMapper mapper;

	RouteService(RouteRepository repository, RouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<Route> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	Route get(UUID userId, UUID id) {
		RouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such route"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	Route create(UUID userId, Route dto) {
		RouteEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new RouteEntity(dto.getId(), userId, dto.getSectorId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	Route update(UUID userId, UUID id, Route dto) {
		RouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such route"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Route already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	Route delete(UUID userId, UUID id) {
		RouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such route"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(RouteEntity entity, Route dto) {
		entity.setName(dto.getName());
		entity.setGuidebookGrade(dto.getGuidebookGrade());
		entity.setLengthInMeters(dto.getLengthInMeters().orElse(null));
		entity.setTotalPitches(dto.getTotalPitches().orElse(null));
		entity.setRockType(dto.getRockType().orElse(null));
		entity.setAspect(dto.getAspect().orElse(null));
	}

	private static RouteEntity requireOwner(RouteEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such route");
		}
		return entity;
	}
}
