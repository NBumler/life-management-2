package hu.bumler.lm2.tasks;

import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RestController;

import hu.bumler.lm2.api.EventsApi;
import hu.bumler.lm2.api.model.CalendarEvent;
import hu.bumler.lm2.common.CurrentUser;

@RestController
class CalendarEventController implements EventsApi {

	private final CalendarEventService calendarEventService;
	private final CurrentUser currentUser;

	CalendarEventController(CalendarEventService calendarEventService, CurrentUser currentUser) {
		this.calendarEventService = calendarEventService;
		this.currentUser = currentUser;
	}

	@Override
	public ResponseEntity<List<CalendarEvent>> listEvents() {
		return ResponseEntity.ok(calendarEventService.list(currentUser.id()));
	}

	@Override
	public ResponseEntity<CalendarEvent> createEvent(CalendarEvent calendarEvent) {
		return ResponseEntity.ok(calendarEventService.create(currentUser.id(), calendarEvent));
	}

	@Override
	public ResponseEntity<CalendarEvent> getEvent(UUID id) {
		return ResponseEntity.ok(calendarEventService.get(currentUser.id(), id));
	}

	@Override
	public ResponseEntity<CalendarEvent> updateEvent(UUID id, CalendarEvent calendarEvent) {
		return ResponseEntity.ok(calendarEventService.update(currentUser.id(), id, calendarEvent));
	}

	@Override
	public ResponseEntity<CalendarEvent> deleteEvent(UUID id) {
		return ResponseEntity.ok(calendarEventService.delete(currentUser.id(), id));
	}
}
