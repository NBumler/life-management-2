package hu.bumler.lm2.workout;

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
import hu.bumler.lm2.api.model.BikeRideLog;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * documentation/Architektúra/Backend.md "Kötelező integrációs esetek" for a fresh entity: idempotent
 * POST replay, 409 ENTITY_DELETED on a PUT after delete, cross-user 404, a create shows up in the
 * delta pull, plus the optional distanceKm / elevationGainMeters round-trip
 * (documentation/Features/Biciklizés napló.md).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class BikeRideLogIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static BikeRideLog log(UUID id, BikeRideLog.IntensityEnum intensity) {
		return new BikeRideLog(id, LocalDate.parse("2026-08-29"), 60, intensity, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("bike-idempotent");
		UUID id = UUID.randomUUID();
		BikeRideLog body = log(id, BikeRideLog.IntensityEnum.CITY);

		createBikeRideLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(60));
		createBikeRideLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(60));
	}

	@Test
	void create_roundTripsOptionalDistanceAndElevation() throws Exception {
		String token = registerAndLogin("bike-optional");
		UUID id = UUID.randomUUID();
		BikeRideLog body = log(id, BikeRideLog.IntensityEnum.ROAD_LEISURE);
		body.distanceKm(24.5);
		body.elevationGainMeters(320);

		createBikeRideLog(token, body)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.distanceKm").value(24.5))
				.andExpect(jsonPath("$.elevationGainMeters").value(320));
	}

	@Test
	void update_returnsEntityDeleted_afterTheLogWasDeleted() throws Exception {
		String token = registerAndLogin("bike-entity-deleted");
		UUID id = UUID.randomUUID();
		createBikeRideLog(token, log(id, BikeRideLog.IntensityEnum.CITY)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/bike-ride-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		BikeRideLog changed = log(id, BikeRideLog.IntensityEnum.ROAD_VIGOROUS);
		mockMvc.perform(put("/api/bike-ride-logs/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("bike-del-idempotent");
		UUID id = UUID.randomUUID();
		createBikeRideLog(token, log(id, BikeRideLog.IntensityEnum.CITY)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/bike-ride-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/bike-ride-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/bike-ride-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenLogBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("bike-owner-a");
		String tokenB = registerAndLogin("bike-attacker-b");
		UUID id = UUID.randomUUID();
		createBikeRideLog(tokenA, log(id, BikeRideLog.IntensityEnum.CITY)).andExpect(status().isOk());

		mockMvc.perform(get("/api/bike-ride-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdLog_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("bike-sync-delta");
		UUID id = UUID.randomUUID();
		createBikeRideLog(token, log(id, BikeRideLog.IntensityEnum.CITY)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"BikeRideLog\"");
	}

	private ResultActions createBikeRideLog(String token, BikeRideLog body) throws Exception {
		return mockMvc.perform(post("/api/bike-ride-logs").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(body)));
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
