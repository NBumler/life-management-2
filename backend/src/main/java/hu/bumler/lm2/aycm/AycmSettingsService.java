package hu.bumler.lm2.aycm;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AycmSettings;
import hu.bumler.lm2.common.DeterministicUuid;
import hu.bumler.lm2.common.exception.EntityNotFoundException;

/**
 * documentation/Features/AYCM tracker.md — the AYCM settings singleton (1:1 per user). Unlike the
 * profile, {@code GET} never 404s: an empty user gets a lazy {@code { id, linkedRecurringExpenseId:
 * null }} at 200 (the spec's table), where {@code id} is the same deterministic UUID v5 the client
 * mints on its first {@code PUT}. Upsert is scoped by {@code userId}, never by the raw
 * {@code dto.getId()}, so a stray client id can't overwrite another user's row.
 */
@Service
class AycmSettingsService {

	private final AycmSettingsRepository repository;
	private final AycmSettingsMapper mapper;

	AycmSettingsService(AycmSettingsRepository repository, AycmSettingsMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	AycmSettings get(UUID userId) {
		return repository.findByUserId(userId)
				.map(mapper::toDto)
				.orElseGet(() -> lazy(userId));
	}

	@Transactional
	AycmSettings upsert(UUID userId, AycmSettings dto) {
		AycmSettingsEntity entity = repository.findByUserId(userId)
				.orElseGet(() -> newEntity(dto.getId(), userId));
		mapper.applyTo(entity, dto);
		// flush, not save: the DB trigger sets updated_at and Hibernate only reads @Generated
		// values back once the statement has actually been sent.
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	private AycmSettings lazy(UUID userId) {
		AycmSettings dto = new AycmSettings(idFor(userId));
		dto.linkedRecurringExpenseId(null);
		return dto;
	}

	private AycmSettingsEntity newEntity(UUID id, UUID userId) {
		// No row via findByUserId, so this id is not yet known to be ours. If it already exists as
		// someone else's row, refuse rather than silently adopting it.
		if (repository.existsById(id)) {
			throw new EntityNotFoundException("No AYCM settings for this user");
		}
		return new AycmSettingsEntity(id, userId);
	}

	private static UUID idFor(UUID userId) {
		return DeterministicUuid.v5("AycmSettings:" + userId);
	}
}
