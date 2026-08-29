package hu.bumler.lm2.climbing;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.GymColorBand;
import hu.bumler.lm2.common.HexColorNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/**
 * documentation/Subfeatures/Indoor boulder admin.md — flat, user-owned colour-band CRUD. Like
 * {@code GymService} but the uniqueness scope is "the owning gym's live bands" on the canonical
 * {@code hexColor} (hu.bumler.lm2.common.HexColorNormalizer). The gym link is fixed at create time.
 */
@Service
class GymColorBandService {

	private final GymColorBandRepository repository;
	private final GymColorBandMapper mapper;

	GymColorBandService(GymColorBandRepository repository, GymColorBandMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<GymColorBand> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	GymColorBand get(UUID userId, UUID id) {
		GymColorBandEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such colour band"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	GymColorBand create(UUID userId, GymColorBand dto) {
		GymColorBandEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new GymColorBandEntity(dto.getId(), userId, dto.getGymId()));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	GymColorBand update(UUID userId, UUID id, GymColorBand dto) {
		GymColorBandEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such colour band"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Colour band already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	GymColorBand delete(UUID userId, UUID id) {
		GymColorBandEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such colour band"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(GymColorBandEntity entity, GymColorBand dto) {
		applyHexColor(entity, dto.getHexColor());
		entity.setName(dto.getName());
		entity.setVariant(dto.getVariant().getValue());
		entity.setGradeLower(dto.getGradeLower());
		entity.setGradeUpper(dto.getGradeUpper());
		entity.setAbsoluteDifficultyIndexLower(dto.getAbsoluteDifficultyIndexLower());
		entity.setAbsoluteDifficultyIndexUpper(dto.getAbsoluteDifficultyIndexUpper());
	}

	/**
	 * documentation/Subfeatures/Indoor boulder admin.md: unique hex per gym, checked on the canonical
	 * form. The client pre-checks locally; a 409 here only fires on a genuine multi-device race, and
	 * carries the conflicting live band's id (ApiError.conflictingId).
	 */
	private void applyHexColor(GymColorBandEntity entity, String rawHexColor) {
		String canonical = HexColorNormalizer.normalize(rawHexColor);
		repository.findByGymIdAndHexColorAndDeletedFalse(entity.getGymId(), canonical)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Hex colour already in use for this gym", "hexColor",
							conflict.getId());
				});
		entity.setHexColor(canonical);
	}

	private static GymColorBandEntity requireOwner(GymColorBandEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such colour band");
		}
		return entity;
	}
}
