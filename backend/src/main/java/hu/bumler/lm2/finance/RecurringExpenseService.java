package hu.bumler.lm2.finance;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.RecurringExpense;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

/**
 * documentation/Subfeatures/Rendszeres kiadások.md — flat, user-owned recurring-expense CRUD
 * (mirrors {@code SwimLogService} / {@code BikeRideLogService}). {@code amountHuf} (>= 1) and
 * {@code billingDayOfMonth} (1..31) are guarded by the OpenAPI schema + DB checks; the service only
 * adds the trim-non-empty rule for {@code name}. The server does NOT auto-roll
 * {@code nextBillingDate} and does NOT compute the monthly equivalent — those are client utilities
 * (spec §Architektúra/Backend).
 */
@Service
class RecurringExpenseService {

	private final RecurringExpenseRepository repository;
	private final RecurringExpenseMapper mapper;

	RecurringExpenseService(RecurringExpenseRepository repository, RecurringExpenseMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<RecurringExpense> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByNextBillingDateAscNameAsc(userId).stream().map(mapper::toDto)
				.toList();
	}

	@Transactional(readOnly = true)
	RecurringExpense get(UUID userId, UUID id) {
		RecurringExpenseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such recurring expense"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	RecurringExpense create(UUID userId, RecurringExpense dto) {
		RecurringExpenseEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new RecurringExpenseEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	@Transactional
	RecurringExpense update(UUID userId, UUID id, RecurringExpense dto) {
		RecurringExpenseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such recurring expense"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Recurring expense already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. */
	@Transactional
	RecurringExpense delete(UUID userId, UUID id) {
		RecurringExpenseEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such recurring expense"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	private void applyFields(RecurringExpenseEntity entity, RecurringExpense dto) {
		String name = dto.getName() == null ? "" : dto.getName().trim();
		if (name.isEmpty()) {
			throw new ValidationException("Recurring expense name must not be blank", "name");
		}
		entity.setName(name);
		entity.setAmountHuf(dto.getAmountHuf());
		entity.setFrequency(dto.getFrequency().getValue());
		entity.setCategory(dto.getCategory().getValue());
		entity.setNextBillingDate(dto.getNextBillingDate());
		entity.setBillingDayOfMonth(dto.getBillingDayOfMonth().shortValue());
		entity.setActive(Boolean.TRUE.equals(dto.getActive()));
		entity.setNotes(dto.getNotes().orElse(null));
	}

	private static RecurringExpenseEntity requireOwner(RecurringExpenseEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such recurring expense");
		}
		return entity;
	}
}
