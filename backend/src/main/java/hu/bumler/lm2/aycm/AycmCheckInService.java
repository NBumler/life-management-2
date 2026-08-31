package hu.bumler.lm2.aycm;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AycmCheckIn;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/AYCM Check-In.md — flat, user-owned Check-In CRUD. The server stores the
 * client's snapshot verbatim (it never runs matchPriceRule) and enforces one rule beyond plain CRUD:
 * at most one live row per user per {@code checkInDate}. The pre-check here returns the conflicting
 * row's id so the client can open it for editing; the partial unique index
 * ({@code idx_aycm_check_in_user_id_check_in_date}) is the multi-device-race safety net.
 */
@Service
class AycmCheckInService {

	private static final String TIME_PATTERN = "([01][0-9]|2[0-3]):[0-5][0-9]";

	private final AycmCheckInRepository repository;
	private final AycmCheckInMapper mapper;

	AycmCheckInService(AycmCheckInRepository repository, AycmCheckInMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<AycmCheckIn> list(UUID userId, LocalDate from, LocalDate to) {
		List<AycmCheckInEntity> rows = (from != null && to != null)
				? repository.findByUserIdAndDeletedFalseAndCheckInDateBetweenOrderByCheckInDateDescCheckInTimeDesc(userId,
						from, to)
				: repository.findByUserIdAndDeletedFalseOrderByCheckInDateDescCheckInTimeDesc(userId);
		return rows.stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	AycmCheckIn get(UUID userId, UUID id) {
		AycmCheckInEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such Check-In"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	AycmCheckIn create(UUID userId, AycmCheckIn dto) {
		AycmCheckInEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new AycmCheckInEntity(dto.getId(), userId));
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	AycmCheckIn update(UUID userId, UUID id, AycmCheckIn dto) {
		AycmCheckInEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such Check-In"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Check-In already deleted");
		}
		applyFields(entity, userId, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent — the day becomes free again. */
	@Transactional
	AycmCheckIn delete(UUID userId, UUID id) {
		AycmCheckInEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such Check-In"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(AycmCheckInEntity entity, UUID userId, AycmCheckIn dto) {
		if (dto.getCheckInDate() == null) {
			throw new ValidationException("checkInDate is required", "checkInDate");
		}
		if (dto.getCheckInTime() == null || !dto.getCheckInTime().matches(TIME_PATTERN)) {
			throw new ValidationException("Invalid time (expected HH:mm)", "checkInTime");
		}
		if (dto.getListPriceHuf() < 0 || dto.getCoPaymentHuf() < 0 || dto.getVisitValueHuf() < 0) {
			throw new ValidationException("Snapshot amounts must not be negative", "listPriceHuf");
		}

		repository.findByUserIdAndCheckInDateAndDeletedFalse(userId, dto.getCheckInDate())
				.filter(existing -> !existing.getId().equals(entity.getId()))
				.ifPresent(conflict -> {
					throw new UniqueViolationException("A Check-In already exists for this day", "checkInDate",
							conflict.getId());
				});

		entity.setCheckInDate(dto.getCheckInDate());
		entity.setCheckInTime(dto.getCheckInTime());
		entity.setPartnerId(dto.getPartnerId());
		entity.setPartnerName(dto.getPartnerName() == null ? "" : dto.getPartnerName());
		entity.setRuleId(dto.getRuleId().orElse(null));
		entity.setRuleLabel(dto.getRuleLabel() == null ? "" : dto.getRuleLabel());
		entity.setListPriceHuf(dto.getListPriceHuf());
		entity.setCoPaymentHuf(dto.getCoPaymentHuf());
		entity.setVisitValueHuf(dto.getVisitValueHuf());
		entity.setNotes(dto.getNotes().orElse(null));
	}

	private static AycmCheckInEntity requireOwner(AycmCheckInEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such Check-In");
		}
		return entity;
	}
}
