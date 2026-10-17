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

import tools.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.Exercise;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.StretchExercise;

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
 * pull (GET /api/sync/changes). backlog/167: plus the separate name namespace from the strength
 * catalog and the HIPS / NECK category widening on the strength Exercise.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class StretchExerciseIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static StretchExercise exercise(UUID id, String name) {
		return new StretchExercise(id, name, StretchExercise.CategoryEnum.HIPS, false, 30, false, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("stex-idempotent");
		UUID id = UUID.randomUUID();
		StretchExercise item = exercise(id, "Fekvenyomás");

		createStretchExercise(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Fekvenyomás"));
		createStretchExercise(token, item).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Fekvenyomás"));
	}

	@Test
	void create_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("stex-unique");
		UUID firstId = UUID.randomUUID();
		createStretchExercise(token, exercise(firstId, "Guggolás")).andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createStretchExercise(token, exercise(secondId, "Guggolás"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void create_allowsTheNameAgain_afterTheOriginalExerciseWasDeleted() throws Exception {
		// documentation/Subfeatures/Gyakorlat.md: "Törölt név újra felvehető".
		String token = registerAndLogin("stex-reuse-name");
		UUID firstId = UUID.randomUUID();
		createStretchExercise(token, exercise(firstId, "Húzódzkodás")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/stretch-exercises/" + firstId).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		UUID secondId = UUID.randomUUID();
		createStretchExercise(token, exercise(secondId, "Húzódzkodás")).andExpect(status().isOk());
	}

	@Test
	void update_returnsEntityDeleted_afterTheExerciseWasDeleted() throws Exception {
		String token = registerAndLogin("stex-entity-deleted");
		UUID id = UUID.randomUUID();
		createStretchExercise(token, exercise(id, "Plank")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/stretch-exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/stretch-exercises/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(exercise(id, "Plank (átírva)"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("stex-delete-idempotent");
		UUID id = UUID.randomUUID();
		createStretchExercise(token, exercise(id, "Kettlebell swing")).andExpect(status().isOk());

		mockMvc.perform(delete("/api/stretch-exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/stretch-exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/stretch-exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenExerciseBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("stex-owner-a");
		String tokenB = registerAndLogin("stex-attacker-b");
		UUID id = UUID.randomUUID();
		createStretchExercise(tokenA, exercise(id, "Evezés")).andExpect(status().isOk());

		mockMvc.perform(get("/api/stretch-exercises/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdExercise_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("stex-sync-delta");
		UUID id = UUID.randomUUID();
		createStretchExercise(token, exercise(id, "Fartlek")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"StretchExercise\"");
	}

	@Test
	void nameNamespace_isSeparateFromTheStrengthCatalog() throws Exception {
		String token = registerAndLogin("stex-namespace");
		Exercise strength = new Exercise(UUID.randomUUID(), "Hát", Exercise.CategoryEnum.BACK,
				Exercise.KindEnum.WEIGHTED_REPS, false, false);
		mockMvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(strength)))
				.andExpect(status().isOk());

		createStretchExercise(token, exercise(UUID.randomUUID(), "Hát")).andExpect(status().isOk());
	}

	@Test
	void strengthExercise_acceptsTheNewHipsAndNeckCategories() throws Exception {
		String token = registerAndLogin("stex-hips-neck");
		for (Exercise.CategoryEnum category : new Exercise.CategoryEnum[] { Exercise.CategoryEnum.HIPS, Exercise.CategoryEnum.NECK }) {
			Exercise strength = new Exercise(UUID.randomUUID(), "Gyakorlat " + category, category,
					Exercise.KindEnum.BODYWEIGHT_REPS, false, false);
			mockMvc.perform(post("/api/exercises").contentType(MediaType.APPLICATION_JSON)
					.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(strength)))
					.andExpect(status().isOk())
					.andExpect(jsonPath("$.category").value(category.getValue()));
		}
	}

	@Test
	void create_roundTripsTheStretchDefaults() throws Exception {
		String token = registerAndLogin("stex-defaults");
		StretchExercise item = exercise(UUID.randomUUID(), "Combhajlító nyújtás");
		item.category(StretchExercise.CategoryEnum.NECK).defaultHoldSeconds(60).defaultPerSide(true);

		createStretchExercise(token, item).andExpect(status().isOk())
				.andExpect(jsonPath("$.category").value("NECK"))
				.andExpect(jsonPath("$.defaultHoldSeconds").value(60))
				.andExpect(jsonPath("$.defaultPerSide").value(true));
	}

	private ResultActions createStretchExercise(String token, StretchExercise item) throws Exception {
		return mockMvc.perform(post("/api/stretch-exercises").contentType(MediaType.APPLICATION_JSON)
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
