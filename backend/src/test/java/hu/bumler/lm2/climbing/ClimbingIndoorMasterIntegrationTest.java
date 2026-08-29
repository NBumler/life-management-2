package hu.bumler.lm2.climbing;

import java.util.List;
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
import hu.bumler.lm2.api.model.Gym;
import hu.bumler.lm2.api.model.GymColorBand;
import hu.bumler.lm2.api.model.IndoorRoute;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for the indoor climbing
 * master resources: idempotent POST replay, 409 UNIQUE_VIOLATION with field + conflictingId (gym
 * name, and colour-band hex per gym on its canonical form), 409 ENTITY_DELETED on a PUT after
 * delete, cross-user 404, and that creates show up in the delta pull.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class ClimbingIndoorMasterIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	// --- Gym ---

	@Test
	void gym_createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("gym-idempotent");
		UUID id = UUID.randomUUID();
		Gym gym = gym(id, "Mászócentrum");

		createGym(token, gym).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mászócentrum"));
		createGym(token, gym).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Mászócentrum"));
	}

	@Test
	void gym_returnsUniqueViolationWithConflictingId_whenNameAlreadyLive() throws Exception {
		String token = registerAndLogin("gym-unique");
		UUID firstId = UUID.randomUUID();
		createGym(token, gym(firstId, "Fal Klub")).andExpect(status().isOk());

		createGym(token, gym(UUID.randomUUID(), "Fal Klub"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("name"))
				.andExpect(jsonPath("$.conflictingId").value(firstId.toString()));
	}

	@Test
	void gym_update_returnsEntityDeleted_afterDelete() throws Exception {
		String token = registerAndLogin("gym-entity-deleted");
		UUID id = UUID.randomUUID();
		createGym(token, gym(id, "Bontandó")).andExpect(status().isOk());
		mockMvc.perform(delete("/api/climbing/gyms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(put("/api/climbing/gyms/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(gym(id, "Bontandó"))))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void gym_delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("gym-delete");
		UUID id = UUID.randomUUID();
		createGym(token, gym(id, "Törlendő")).andExpect(status().isOk());

		for (int i = 0; i < 2; i++) {
			mockMvc.perform(delete("/api/climbing/gyms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
					.andExpect(status().isOk());
		}
		mockMvc.perform(get("/api/climbing/gyms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void gym_get_returnsNotFound_whenGymBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("gym-owner");
		String tokenB = registerAndLogin("gym-attacker");
		UUID id = UUID.randomUUID();
		createGym(tokenA, gym(id, "A terme")).andExpect(status().isOk());

		mockMvc.perform(get("/api/climbing/gyms/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	// --- GymColorBand ---

	@Test
	void colorBand_storesCanonicalHex_andRejectsDuplicatePerGymWithConflictingId() throws Exception {
		String token = registerAndLogin("band-hex");
		UUID gymId = UUID.randomUUID();
		createGym(token, gym(gymId, "Boulder terem")).andExpect(status().isOk());

		UUID firstBandId = UUID.randomUUID();
		createBand(token, band(firstBandId, gymId, "F0A")).andExpect(status().isOk());
		mockMvc.perform(get("/api/climbing/gym-color-bands/" + firstBandId)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andExpect(jsonPath("$.hexColor").value("#ff00aa"));

		createBand(token, band(UUID.randomUUID(), gymId, "#FF00AA"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("UNIQUE_VIOLATION"))
				.andExpect(jsonPath("$.field").value("hexColor"))
				.andExpect(jsonPath("$.conflictingId").value(firstBandId.toString()));
	}

	// --- IndoorRoute ---

	@Test
	void indoorRoute_createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("route-idempotent");
		UUID gymId = UUID.randomUUID();
		createGym(token, gym(gymId, "Köteles terem")).andExpect(status().isOk());
		UUID id = UUID.randomUUID();
		IndoorRoute route = route(id, gymId, "Sárga 12");

		createRoute(token, route).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sárga 12"));
		createRoute(token, route).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Sárga 12"));
	}

	// --- delta pull ---

	@Test
	void createdIndoorMasterRows_appearInTheDeltaPull() throws Exception {
		String token = registerAndLogin("climbing-sync-delta");
		UUID gymId = UUID.randomUUID();
		UUID bandId = UUID.randomUUID();
		UUID routeId = UUID.randomUUID();
		createGym(token, gym(gymId, "Sync terem")).andExpect(status().isOk());
		createBand(token, band(bandId, gymId, "#112233")).andExpect(status().isOk());
		createRoute(token, route(routeId, gymId, "Sync út")).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains("\"entityType\":\"Gym\"").contains(gymId.toString());
		assertThat(body).contains("\"entityType\":\"GymColorBand\"").contains(bandId.toString());
		assertThat(body).contains("\"entityType\":\"IndoorRoute\"").contains(routeId.toString());
	}

	// --- helpers ---

	private static Gym gym(UUID id, String name) {
		return new Gym(id, name, List.of(Gym.DisciplinesEnum.BOULDER, Gym.DisciplinesEnum.ROPE), false);
	}

	private static GymColorBand band(UUID id, UUID gymId, String hex) {
		return new GymColorBand(id, gymId, "Piros", hex, GymColorBand.VariantEnum.NEUTRAL, "6A", "6B", 40, 44, false);
	}

	private static IndoorRoute route(UUID id, UUID gymId, String name) {
		return new IndoorRoute(id, gymId, name, IndoorRoute.DisciplineEnum.ROPE, "7A", 50, false);
	}

	private ResultActions createGym(String token, Gym gym) throws Exception {
		return mockMvc.perform(post("/api/climbing/gyms").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(gym)));
	}

	private ResultActions createBand(String token, GymColorBand band) throws Exception {
		return mockMvc.perform(post("/api/climbing/gym-color-bands").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(band)));
	}

	private ResultActions createRoute(String token, IndoorRoute route) throws Exception {
		return mockMvc.perform(post("/api/climbing/indoor-routes").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(route)));
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
