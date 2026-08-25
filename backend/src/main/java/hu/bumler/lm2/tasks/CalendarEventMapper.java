package hu.bumler.lm2.tasks;

import org.springframework.stereotype.Component;

import hu.bumler.lm2.api.model.CalendarEvent;

@Component
class CalendarEventMapper {

	CalendarEvent toDto(CalendarEventEntity entity) {
		CalendarEvent dto = new CalendarEvent(entity.getId(), entity.getTitle(), entity.isAllDay(), entity.getDate(),
				entity.getInterval(), entity.isDeleted());
		dto.location(entity.getLocation());
		dto.notes(entity.getNotes());
		dto.startTime(entity.getStartTime());
		dto.endTime(entity.getEndTime());
		if (entity.getFrequency() != null) {
			dto.frequency(CalendarEvent.FrequencyEnum.fromValue(entity.getFrequency()));
		}
		dto.deletedAt(entity.getDeletedAt());
		dto.createdAt(entity.getCreatedAt());
		dto.updatedAt(entity.getUpdatedAt());
		return dto;
	}
}
