package hu.bumler.lm2.tura;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.HikeRoute;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis — flat, user-owned kézi útvonal CRUD (mirrors
 * {@code RecurringExpenseService}). Az egyetlen validáció: a név nem üres, és legalább 2 pont
 * (waypoint) van a vonalban.
 */
@Service
class HikeRouteService {

	private final HikeRouteRepository repository;
	private final HikeRouteMapper mapper;

	HikeRouteService(HikeRouteRepository repository, HikeRouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<HikeRoute> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByUpdatedAtDesc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	HikeRoute get(UUID userId, UUID id) {
		HikeRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such hike route"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	HikeRoute create(UUID userId, HikeRoute dto) {
		HikeRouteEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new HikeRouteEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	HikeRoute update(UUID userId, UUID id, HikeRoute dto) {
		HikeRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such hike route"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Hike route already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	HikeRoute delete(UUID userId, UUID id) {
		HikeRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such hike route"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(HikeRouteEntity entity, HikeRoute dto) {
		String name = dto.getName() == null ? "" : dto.getName().trim();
		if (name.isEmpty()) {
			throw new ValidationException("Hike route name must not be blank", "name");
		}
		if (dto.getCoordinates() == null || dto.getCoordinates().size() < 2) {
			throw new ValidationException("Hike route needs at least 2 waypoints", "coordinates");
		}
		entity.setName(name);
		entity.setCoordinates(TrailSegmentMapper.flatten(dto.getCoordinates()));
	}

	private static HikeRouteEntity requireOwner(HikeRouteEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such hike route");
		}
		return entity;
	}
}
