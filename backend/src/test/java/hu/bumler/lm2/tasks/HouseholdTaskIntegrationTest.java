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
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" plus the
 * room-scoped uniqueness and cross-user room reference rules from
 * documentation/Subfeatures/Háztartási feladatok.md.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class HouseholdTaskIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("task-idempotent");
		UUID roomId = createRoom(token, "Konyha");
		UUID id = UUID.randomUUID();
		HouseholdTask task = task(id, roomId, "Mosogatás");

		createTask(token, task).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mosogatás"));
		createTask(token, task).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mosogatás"));
	}

	@Test
	void create_returnsNotFound_whenRoomBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("task-room-owner-a");
		String tokenB = registerAndLogin("task-room-atk-b");
		UUID roomId = createRoom(tokenA, "Konyha");

		createTask(tokenB, task(UUID.randomUUID(), roomId, "Mosogatás")).andExpect(status().isNotFound());
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLiveInTheSameRoom() throws Exception {
		String token = registerAndLogin("task-unique");
		UUID roomId = createRoom(token, "Konyha");
		UUID firstId = UUID.randomUUID();
		createTask(token, task(firstId, roomId, "Mosogatás")).andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createTask(token, task(secondId, roomId, "Mosogatás"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_allowsTheSameName_inDifferentRooms() throws Exception {
		String token = registerAndLogin("task-diff-room");
		UUID roomA = createRoom(token, "Konyha");
		UUID roomB = createRoom(token, "Fürdő");
		createTask(token, task(UUID.randomUUID(), roomA, "Takarítás")).andExpect(status().isOk());

		createTask(token, task(UUID.randomUUID(), roomB, "Takarítás")).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheTaskWasDeleted() throws Exception {
		String token = registerAndLogin("task-entity-del");
		UUID roomId = createRoom(token, "Konyha");
		UUID id = UUID.randomUUID();
		createTask(token, task(id, roomId, "Mosogatás")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/household-tasks/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/household-tasks/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(task(id, roomId, "Mosogatás (átírva)"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void update_persistsTheClientRolledNextDue_onCompletion() throws Exception {
		String token = registerAndLogin("task-complete");
		UUID roomId = createRoom(token, "Konyha");
		UUID id = UUID.randomUUID();
		createTask(token, task(id, roomId, "Mosogatás")).andExpect(status().isOk());

		HouseholdTask completed = task(id, roomId, "Mosogatás");
		completed.nextDue(LocalDate.of(2026, 1, 8));
		completed.lastCompletedAt(java.time.OffsetDateTime.parse("2026-01-01T09:00:00Z"));

		mockMvc.perform(put("/api/household-tasks/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(completed)))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.nextDue").value("2026-01-08"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("task-delete-idemp");
		UUID roomId = createRoom(token, "Konyha");
		UUID id = UUID.randomUUID();
		createTask(token, task(id, roomId, "Mosogatás")).andExpect(status().isOk());

		mockMvc.perform(delete("/api/household-tasks/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/household-tasks/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/household-tasks/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenTaskBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("task-owner-a");
		String tokenB = registerAndLogin("task-attacker-b");
		UUID roomId = createRoom(tokenA, "Konyha");
		UUID id = UUID.randomUUID();
		createTask(tokenA, task(id, roomId, "Mosogatás")).andExpect(status().isOk());

		mockMvc.perform(get("/api/household-tasks/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdTask_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("task-sync-delta");
		UUID roomId = createRoom(token, "Konyha");
		UUID id = UUID.randomUUID();
		createTask(token, task(id, roomId, "Mosogatás")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"HouseholdTask\"");
	}

	private HouseholdTask task(UUID id, UUID roomId, String name) {
		return new HouseholdTask(id, roomId, name, HouseholdTask.EnergyLevelEnum.LOW, 10, 7, LocalDate.of(2026, 1, 1), false);
	}

	private UUID createRoom(String token, String name) throws Exception {
		UUID id = UUID.randomUUID();
		mockMvc.perform(post("/api/household-rooms").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(new HouseholdRoom(id, name, 0, false))))
				.andExpect(status().isOk());
		return id;
	}

	private ResultActions createTask(String token, HouseholdTask task) throws Exception {
		return mockMvc.perform(post("/api/household-tasks").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(task)));
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
