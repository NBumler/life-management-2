package hu.bumler.lm2.aycm;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AycmPartner;
import hu.bumler.lm2.common.NameNormalizer;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/AYCM elfogadóhely hozzáadása.md — flat, user-owned partner CRUD
 * (mirrors {@code GearItemService}). {@code name} is trim-non-empty and unique among the user's live
 * partners (documentation/Architektúra/Névegyediség.md → {@code 409 UNIQUE_VIOLATION} with the
 * conflicting id). {@code DELETE} soft-deletes the partner and cascades to its live price rules; it
 * never touches {@code AycmCheckIn} snapshots.
 */
@Service
class AycmPartnerService {

	private final AycmPartnerRepository repository;
	private final AycmPriceRuleRepository priceRuleRepository;
	private final AycmPartnerMapper mapper;

	AycmPartnerService(AycmPartnerRepository repository, AycmPriceRuleRepository priceRuleRepository,
			AycmPartnerMapper mapper) {
		this.repository = repository;
		this.priceRuleRepository = priceRuleRepository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<AycmPartner> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNameAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	AycmPartner get(UUID userId, UUID id) {
		AycmPartnerEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such partner"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	AycmPartner create(UUID userId, AycmPartner dto) {
		AycmPartnerEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new AycmPartnerEntity(dto.getId(), userId));
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	AycmPartner update(UUID userId, UUID id, AycmPartner dto) {
		AycmPartnerEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such partner"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Partner already deleted");
		}
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent, cascading to the partner's live price rules. */
	@Transactional
	AycmPartner delete(UUID userId, UUID id) {
		AycmPartnerEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such partner"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
			for (AycmPriceRuleEntity rule : priceRuleRepository
					.findByPartnerIdAndUserIdAndDeletedFalseOrderByStartTimeAsc(id, userId)) {
				rule.softDelete();
				priceRuleRepository.save(rule);
			}
			priceRuleRepository.flush();
		}
		return mapper.toDto(entity);
	}

	private void applyFields(AycmPartnerEntity entity, UUID userId, AycmPartner dto) {
		String name = dto.getName() == null ? "" : dto.getName().trim();
		if (name.isEmpty()) {
			throw new ValidationException("Partner name must not be blank", "name");
		}
		String normalized = NameNormalizer.normalize(name);
		repository.findByUserIdAndNameNormalizedAndDeletedFalse(userId, normalized)
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("Partner name already in use", "name", conflict.getId());
				});
		entity.rename(name, normalized);
		entity.setNotes(dto.getNotes().orElse(null));
	}

	private static AycmPartnerEntity requireOwner(AycmPartnerEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such partner");
		}
		return entity;
	}
}
