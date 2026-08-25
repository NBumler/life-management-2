package hu.bumler.lm2.tasks;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.CalendarEvent;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek": idempotent POST
 * replay, 409 ENTITY_DELETED on PUT-after-delete, cross-user 404, delta pull, and the
 * allDay/startTime/endTime 400 validation (documentation/Features/Események.md).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class CalendarEventIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static CalendarEvent timedEvent(UUID id, String title) {
		CalendarEvent event = new CalendarEvent(id, title, false, LocalDate.of(2026, 6, 1), 1, false);
		event.startTime("10:00");
		event.endTime("11:00");
		return event;
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("event-idempotent");
		UUID id = UUID.randomUUID();
		CalendarEvent event = timedEvent(id, "Fogorvos");

		createEvent(token, event).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Fogorvos"));
		createEvent(token, event).andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Fogorvos"));
	}

	@Test
	void create_acceptsAllDay_withoutTimes() throws Exception {
		String token = registerAndLogin("event-allday");
		UUID id = UUID.randomUUID();
		CalendarEvent event = new CalendarEvent(id, "Szülinap", true, LocalDate.of(2026, 6, 1), 1, false);

		createEvent(token, event).andExpect(status().isOk()).andExpect(jsonPath("$.allDay").value(true));
	}

	@Test
	void create_rejectsTimedEvent_withoutBothTimes() throws Exception {
		String token = registerAndLogin("event-validation");
		CalendarEvent event = new CalendarEvent(UUID.randomUUID(), "Fogorvos", false, LocalDate.of(2026, 6, 1), 1, false);
		event.startTime("10:00");

		createEvent(token, event)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheEventWasDeleted() throws Exception {
		String token = registerAndLogin("event-entity-del");
		UUID id = UUID.randomUUID();
		createEvent(token, timedEvent(id, "Fogorvos")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/events/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/events/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(timedEvent(id, "Fogorvos (átírva)"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("event-delete-idemp");
		UUID id = UUID.randomUUID();
		createEvent(token, timedEvent(id, "Fogorvos")).andExpect(status().isOk());

		mockMvc.perform(delete("/api/events/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/events/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/events/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenEventBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("event-owner-a");
		String tokenB = registerAndLogin("event-attacker-b");
		UUID id = UUID.randomUUID();
		createEvent(tokenA, timedEvent(id, "Fogorvos")).andExpect(status().isOk());

		mockMvc.perform(get("/api/events/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdEvent_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("event-sync-delta");
		UUID id = UUID.randomUUID();
		createEvent(token, timedEvent(id, "Fogorvos")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"CalendarEvent\"");
	}

	private ResultActions createEvent(String token, CalendarEvent event) throws Exception {
		return mockMvc.perform(post("/api/events").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(event)));
	}

	private String registerAndLogin(String usernamePrefix) throws Exception {
		String username = usernamePrefix + "-" + UUID.randomUUID().toString().substring(0, 8);
		String password = "correct-horse-battery";
		mockMvc.perform(post("/api/admin/users").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(json(new AdminCreateUserRequest(username, password))))
				.andExpect(status().isCreated());

		MvcResult login = mockMvc
				.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
						.content(json(new LoginRequest(username, password))))
				.andExpect(status().isOk()).andReturn();
		return objectMapper.readValue(login.getResponse().getContentAsString(), AuthTokens.class).getAccessToken();
	}

	private String json(Object body) throws Exception {
		return objectMapper.writeValueAsString(body);
	}
}
