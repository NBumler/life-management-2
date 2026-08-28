package hu.bumler.lm2.workout;

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
import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Covers the documentation/Architektúra/Backend.md "Kötelező integrációs esetek" that apply to a
 * fresh entity: idempotent POST replay, 409 UNIQUE_VIOLATION with field + conflictingId, 409
 * ENTITY_DELETED on a PUT after delete, cross-user 404, and that a create shows up in the delta
 * pull (GET /api/sync/changes).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class ExerciseIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static Exercise exercise(UUID id, String name) {
		return new Exercise(id, name, Exercise.CategoryEnum.CHEST, Exercise.KindEnum.WEIGHTED_REPS, false, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("ex-idempotent");
		UUID id = UUID.randomUUID();
		Exercise item = exercise(id, "Fekvenyomás");

		createExercise(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Fekvenyomás"));
		createExercise(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Fekvenyomás"));
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("ex-unique");
		UUID firstId = UUID.randomUUID();
		createExercise(token, exercise(firstId, "Guggolás")).andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createExercise(token, exercise(secondId, "Guggolás"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_allowsTheNameAgain_afterTheOriginalExerciseWasDeleted() throws Exception {
		// documentation/Subfeatures/Gyakorlat.md: "Törölt név újra felvehető".
		String token = registerAndLogin("ex-reuse-name");
		UUID firstId = UUID.randomUUID();
		createExercise(token, exercise(firstId, "Húzódzkodás")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/exercises/" + firstId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createExercise(token, exercise(secondId, "Húzódzkodás")).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheExerciseWasDeleted() throws Exception {
		String token = registerAndLogin("ex-entity-deleted");
		UUID id = UUID.randomUUID();
		createExercise(token, exercise(id, "Plank")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/exercises/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(exercise(id, "Plank (átírva)"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("ex-delete-idempotent");
		UUID id = UUID.randomUUID();
		createExercise(token, exercise(id, "Kettlebell swing")).andExpect(status().isOk());

		mockMvc.perform(delete("/api/exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenExerciseBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("ex-owner-a");
		String tokenB = registerAndLogin("ex-attacker-b");
		UUID id = UUID.randomUUID();
		createExercise(tokenA, exercise(id, "Evezés")).andExpect(status().isOk());

		mockMvc.perform(get("/api/exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdExercise_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("ex-sync-delta");
		UUID id = UUID.randomUUID();
		createExercise(token, exercise(id, "Fartlek")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"Exercise\"");
	}

	private ResultActions createExercise(String token, Exercise item) throws Exception {
		return mockMvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(item)));
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
