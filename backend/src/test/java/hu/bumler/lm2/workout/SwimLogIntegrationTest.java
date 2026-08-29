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
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.SwimLog;

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
 * delta pull, plus the pool-field validation (documentation/Features/Úszás napló.md "Medence mezők
 * együtt").
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class SwimLogIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static SwimLog log(UUID id, SwimLog.IntensityEnum intensity) {
		return new SwimLog(id, LocalDate.parse("2026-08-29"), 45, intensity, false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("swim-idempotent");
		UUID id = UUID.randomUUID();
		SwimLog body = log(id, SwimLog.IntensityEnum.CASUAL);

		createSwimLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(45));
		createSwimLog(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.durationMinutes").value(45));
	}

	@Test
	void create_computesDistance_fromPoolLengthAndLapCount() throws Exception {
		String token = registerAndLogin("swim-distance");
		UUID id = UUID.randomUUID();
		SwimLog body = log(id, SwimLog.IntensityEnum.CRAWL_FREESTYLE);
		body.poolLengthMeters(25);
		body.lapCount(32);

		createSwimLog(token, body)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.distanceMeters").value(800));
	}

	@Test
	void create_rejectsUnpairedPoolFields() throws Exception {
		String token = registerAndLogin("swim-unpaired");
		UUID id = UUID.randomUUID();
		SwimLog body = log(id, SwimLog.IntensityEnum.CASUAL);
		body.poolLengthMeters(50);

		createSwimLog(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("lapCount"));
	}

	@Test
	void create_rejectsPoolFieldsForOpenWater() throws Exception {
		String token = registerAndLogin("swim-openwater");
		UUID id = UUID.randomUUID();
		SwimLog body = log(id, SwimLog.IntensityEnum.OPEN_WATER);
		body.poolLengthMeters(25);
		body.lapCount(20);

		createSwimLog(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("poolLengthMeters"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheLogWasDeleted() throws Exception {
		String token = registerAndLogin("swim-entity-deleted");
		UUID id = UUID.randomUUID();
		createSwimLog(token, log(id, SwimLog.IntensityEnum.CASUAL)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/swim-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		SwimLog changed = log(id, SwimLog.IntensityEnum.VIGOROUS);
		mockMvc.perform(put("/api/swim-logs/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("swim-del-idempotent");
		UUID id = UUID.randomUUID();
		createSwimLog(token, log(id, SwimLog.IntensityEnum.CASUAL)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/swim-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/swim-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/swim-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenLogBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("swim-owner-a");
		String tokenB = registerAndLogin("swim-attacker-b");
		UUID id = UUID.randomUUID();
		createSwimLog(tokenA, log(id, SwimLog.IntensityEnum.CASUAL)).andExpect(status().isOk());

		mockMvc.perform(get("/api/swim-logs/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void createdLog_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("swim-sync-delta");
		UUID id = UUID.randomUUID();
		createSwimLog(token, log(id, SwimLog.IntensityEnum.CASUAL)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"SwimLog\"");
	}

	private ResultActions createSwimLog(String token, SwimLog body) throws Exception {
		return mockMvc.perform(post("/api/swim-logs").contentType(MediaType.APPLICATION_JSON)
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
