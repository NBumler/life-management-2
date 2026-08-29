package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.IndoorRoute;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Subfeatures/Indoor köteles admin.md — flat, user-owned indoor-route catalogue CRUD
 * (mirrors {@code BikeRideLogService}: idempotent upsert, cross-user 404, soft delete). No name
 * uniqueness — it is a loose catalogue. The gym link is fixed at create time.
 */
@Service
class IndoorRouteService {

	private final IndoorRouteRepository repository;
	private final IndoorRouteMapper mapper;

	IndoorRouteService(IndoorRouteRepository repository, IndoorRouteMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<IndoorRoute> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	IndoorRoute get(UUID userId, UUID id) {
		IndoorRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such indoor route"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	IndoorRoute create(UUID userId, IndoorRoute dto) {
		IndoorRouteEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new IndoorRouteEntity(dto.getId(), userId, dto.getGymId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	IndoorRoute update(UUID userId, UUID id, IndoorRoute dto) {
		IndoorRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such indoor route"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Indoor route already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	IndoorRoute delete(UUID userId, UUID id) {
		IndoorRouteEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such indoor route"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(IndoorRouteEntity entity, IndoorRoute dto) {
		entity.setName(dto.getName());
		entity.setDiscipline(dto.getDiscipline().getValue());
		entity.setGrade(dto.getGrade());
		entity.setAbsoluteDifficultyIndex(dto.getAbsoluteDifficultyIndex());
		entity.setSector(dto.getSector().orElse(null));
	}

	private static IndoorRouteEntity requireOwner(IndoorRouteEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such indoor route");
		}
		return entity;
	}
}
