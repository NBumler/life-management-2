package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.CalendarEvent;
import hu.bumler.lm2.common.exception.EntityDeletedException;
import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.ValidationException;

@Service
class CalendarEventService {

	private final CalendarEventRepository repository;
	private final CalendarEventMapper mapper;

	CalendarEventService(CalendarEventRepository repository, CalendarEventMapper mapper) {
		this.repository = repository;
		this.mapper = mapper;
	}

	@Transactional(readOnly = true)
	List<CalendarEvent> list(UUID userId) {
		return repository.findByUserIdAndDeletedFalseOrderByDateAsc(userId).stream().map(mapper::toDto).toList();
	}

	@Transactional(readOnly = true)
	CalendarEvent get(UUID userId, UUID id) {
		CalendarEventEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such event"));
		return mapper.toDto(entity);
	}

	/** Idempotent upsert on the client-supplied id (documentation/Architektúra/Backend.md "Upsert"). */
	@Transactional
	CalendarEvent create(UUID userId, CalendarEvent dto) {
		CalendarEventEntity entity = repository.findById(dto.getId())
				.map(existing -> requireOwner(existing, userId))
				.orElseGet(() -> new CalendarEventEntity(dto.getId(), userId));
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Full update, always applying to the whole series (documentation/Features/Események.md "Modell: egy sor = egy sorozat"). */
	@Transactional
	CalendarEvent update(UUID userId, UUID id, CalendarEvent dto) {
		CalendarEventEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such event"));
		if (entity.isDeleted()) {
			throw new EntityDeletedException("Event already deleted");
		}
		applyFields(entity, dto);
		return mapper.toDto(repository.saveAndFlush(entity));
	}

	/** Soft delete, idempotent. Deletes the whole series, no undelete (documentation/Features/Események.md). */
	@Transactional
	CalendarEvent delete(UUID userId, UUID id) {
		CalendarEventEntity entity = repository.findByIdAndUserId(id, userId)
				.orElseThrow(() -> new EntityNotFoundException("No such event"));
		if (!entity.isDeleted()) {
			entity.softDelete();
			repository.saveAndFlush(entity);
		}
		return mapper.toDto(entity);
	}

	/**
	 * documentation/Features/Események.md: `allDay = true` -> both times null; `allDay = false` ->
	 * both times required and `endTime > startTime`. The client already enforces this in the form;
	 * this is the server-side guard against a genuinely malformed payload.
	 */
	private void applyFields(CalendarEventEntity entity, CalendarEvent dto) {
		String startTime = dto.getStartTime().orElse(null);
		String endTime = dto.getEndTime().orElse(null);
		if (dto.getAllDay()) {
			if (startTime != null || endTime != null) {
				throw new ValidationException("startTime/endTime must be empty when allDay is true", "startTime");
			}
		} else {
			if (startTime == null || endTime == null) {
				throw new ValidationException("startTime and endTime are required when allDay is false", "startTime");
			}
			if (endTime.compareTo(startTime) <= 0) {
				throw new ValidationException("endTime must be after startTime", "endTime");
			}
		}

		entity.setTitle(dto.getTitle());
		entity.setLocation(dto.getLocation().orElse(null));
		entity.setNotes(dto.getNotes().orElse(null));
		entity.setAllDay(dto.getAllDay());
		entity.setDate(dto.getDate());
		entity.setStartTime(startTime);
		entity.setEndTime(endTime);
		CalendarEvent.FrequencyEnum frequency = dto.getFrequency().orElse(null);
		entity.setFrequency(frequency == null ? null : frequency.getValue());
		entity.setInterval(dto.getInterval());
	}

	private static CalendarEventEntity requireOwner(CalendarEventEntity entity, UUID userId) {
		if (!entity.getUserId().equals(userId)) {
			throw new EntityNotFoundException("No such event");
		}
		return entity;
	}
}
