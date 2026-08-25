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
import hu.bumler.lm2.api.model.HouseholdRoom;
import hu.bumler.lm2.api.model.HouseholdTask;
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
 * replay, 409 UNIQUE_VIOLATION with field+conflictingId, 409 ENTITY_DELETED on PUT-after-delete,
 * cross-user 404, delta pull, and the room -> task cascade delete
 * (documentation/Subfeatures/Háztartási feladatok.md "Törlés").
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class HouseholdRoomIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("room-idempotent");
		UUID id = UUID.randomUUID();
		HouseholdRoom room = new HouseholdRoom(id, "Konyha", 0, false);

		createRoom(token, room).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Konyha"));
		createRoom(token, room).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Konyha"));
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("room-unique");
		UUID firstId = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(firstId, "Fürdő", 0, false)).andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(secondId, "Fürdő", 1, false))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_allowsTheNameAgain_afterTheOriginalRoomWasDeleted() throws Exception {
		String token = registerAndLogin("room-reuse-name");
		UUID firstId = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(firstId, "Nappali", 0, false)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/household-rooms/" + firstId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(secondId, "Nappali", 0, false)).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheRoomWasDeleted() throws Exception {
		String token = registerAndLogin("room-entity-del");
		UUID id = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(id, "Iroda", 0, false)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/household-rooms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/household-rooms/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(new HouseholdRoom(id, "Iroda (átírva)", 0, false))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("room-delete-idemp");
		UUID id = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(id, "Gardrób", 0, false)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/household-rooms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/household-rooms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/household-rooms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void delete_cascadesToLiveTasksInTheRoom() throws Exception {
		String token = registerAndLogin("room-cascade");
		UUID roomId = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(roomId, "Konyha", 0, false)).andExpect(status().isOk());
		UUID taskId = UUID.randomUUID();
		HouseholdTask task = new HouseholdTask(taskId, roomId, "Mosogatás", HouseholdTask.EnergyLevelEnum.LOW, 10, 1,
				LocalDate.of(2026, 1, 1), false);
		mockMvc.perform(post("/api/household-tasks").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(task)))
				.andExpect(status().isOk());

		mockMvc.perform(delete("/api/household-rooms/" + roomId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/household-tasks/" + taskId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenRoomBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("room-owner-a");
		String tokenB = registerAndLogin("room-attacker-b");
		UUID id = UUID.randomUUID();
		createRoom(tokenA, new HouseholdRoom(id, "Konyha", 0, false)).andExpect(status().isOk());

		mockMvc.perform(get("/api/household-rooms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdRoom_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("room-sync-delta");
		UUID id = UUID.randomUUID();
		createRoom(token, new HouseholdRoom(id, "Konyha", 0, false)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"HouseholdRoom\"");
	}

	private ResultActions createRoom(String token, HouseholdRoom room) throws Exception {
		return mockMvc.perform(post("/api/household-rooms").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(room)));
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
