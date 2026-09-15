package hu.bumler.lm2.tura;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.CuratedRouteUpsertRequest;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/tura-utvonaltervezo/103-... 2.5 fázis — admin upsert/törlés + szűrhető katalógus-lekérdezés.
 * A valós {@link OpenMeteoElevationClient} helyett egy mockolt {@link ElevationClient} biztosítja a
 * determinisztikus, hálózat nélküli metrika-számítást (ugyanaz a bab, mint amit
 * {@code RouteMetricsService} amúgy a /api/tura/route-metrics hívásokhoz is használ).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class CuratedRouteIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@MockitoBean
	private ElevationClient elevationClient;

	@Test
	void upsert_computesDistanceAndDurationFromCoordinates() throws Exception {
		stubFlatElevation();
		UUID id = UUID.randomUUID();
		CuratedRouteUpsertRequest request = request(id, "Rövid kilátótúra", "EASY", "HIKING", shortCoordinates());

		upsert(request).andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(id.toString()))
				.andExpect(jsonPath("$.distanceMeters").value(org.hamcrest.Matchers.greaterThan(0.0)))
				.andExpect(jsonPath("$.elevationGainMeters").value(0.0))
				.andExpect(jsonPath("$.elevationLossMeters").value(0.0))
				.andExpect(jsonPath("$.estimatedDurationMinutes").value(org.hamcrest.Matchers.greaterThan(0.0)));
	}

	@Test
	void upsert_rejectsBlankName() throws Exception {
		stubFlatElevation();
		CuratedRouteUpsertRequest request = request(UUID.randomUUID(), "   ", "EASY", "HIKING", shortCoordinates());

		upsert(request).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void upsert_rejectsFewerThanTwoWaypoints() throws Exception {
		stubFlatElevation();
		CuratedRouteUpsertRequest request = request(UUID.randomUUID(), "Egy pont", "EASY", "HIKING",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0))));

		upsert(request).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("coordinates"));
	}

	@Test
	void upsert_rejectsInvalidDaySplit() throws Exception {
		stubFlatElevation();
		CuratedRouteUpsertRequest request = request(UUID.randomUUID(), "Rossz napi bontás", "MODERATE", "HIKING",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)), List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1)),
						List.of(BigDecimal.valueOf(19.2), BigDecimal.valueOf(47.2))));
		request.days(List.of(new hu.bumler.lm2.api.model.HikeRouteDay(1), new hu.bumler.lm2.api.model.HikeRouteDay(1)));

		upsert(request).andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("days"));
	}

	@Test
	void upsert_requiresTheAdminApiKey_notABearerToken() throws Exception {
		String token = registerAndLogin("cr-no-admin-key");
		CuratedRouteUpsertRequest request = request(UUID.randomUUID(), "Túra", "EASY", "HIKING", shortCoordinates());

		mockMvc.perform(post("/api/admin/tura/curated-routes").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(request)))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void list_returnsUpsertedRoute_toAnyAuthenticatedUser() throws Exception {
		stubFlatElevation();
		UUID id = UUID.randomUUID();
		upsert(request(id, "Katalógus túra", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());

		String token = registerAndLogin("cr-list");
		MvcResult result = mockMvc.perform(get("/api/tura/curated-routes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		assertThat(result.getResponse().getContentAsString()).contains(id.toString()).contains("Katalógus túra");
	}

	@Test
	void list_filtersByDifficulty() throws Exception {
		stubFlatElevation();
		UUID easyId = UUID.randomUUID();
		UUID hardId = UUID.randomUUID();
		upsert(request(easyId, "Könnyű séta", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());
		upsert(request(hardId, "Nehéz hegyitúra", "HARD", "HIKING", shortCoordinates())).andExpect(status().isOk());

		String token = registerAndLogin("cr-filter-difficulty");
		MvcResult result = mockMvc.perform(get("/api/tura/curated-routes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.param("difficulty", "EASY"))
				.andExpect(status().isOk()).andReturn();

		String body = result.getResponse().getContentAsString();
		assertThat(body).contains(easyId.toString()).doesNotContain(hardId.toString());
	}

	@Test
	void list_filtersByActivityType() throws Exception {
		stubFlatElevation();
		UUID hikingId = UUID.randomUUID();
		UUID cyclingId = UUID.randomUUID();
		upsert(request(hikingId, "Gyalogtúra", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());
		upsert(request(cyclingId, "Biciklitúra", "EASY", "CYCLING", shortCoordinates())).andExpect(status().isOk());

		String token = registerAndLogin("cr-filter-activity");
		MvcResult result = mockMvc.perform(get("/api/tura/curated-routes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.param("activityType", "CYCLING"))
				.andExpect(status().isOk()).andReturn();

		String body = result.getResponse().getContentAsString();
		assertThat(body).contains(cyclingId.toString()).doesNotContain(hikingId.toString());
	}

	@Test
	void list_filtersByDistanceRange() throws Exception {
		stubFlatElevation();
		UUID shortId = UUID.randomUUID();
		UUID longId = UUID.randomUUID();
		upsert(request(shortId, "Rövid séta", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());
		upsert(request(longId, "Hosszú túra", "HARD", "HIKING", longCoordinates())).andExpect(status().isOk());

		String token = registerAndLogin("cr-filter-distance");
		MvcResult result = mockMvc.perform(get("/api/tura/curated-routes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.param("minDistanceMeters", "10000"))
				.andExpect(status().isOk()).andReturn();

		String body = result.getResponse().getContentAsString();
		assertThat(body).contains(longId.toString()).doesNotContain(shortId.toString());
	}

	@Test
	void delete_removesTheRoute_andIsIdempotent() throws Exception {
		stubFlatElevation();
		UUID id = UUID.randomUUID();
		upsert(request(id, "Törlendő túra", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());

		mockMvc.perform(delete("/api/admin/tura/curated-routes/" + id).header("X-Admin-Api-Key", "test-admin-api-key"))
				.andExpect(status().isNoContent());
		mockMvc.perform(delete("/api/admin/tura/curated-routes/" + id).header("X-Admin-Api-Key", "test-admin-api-key"))
				.andExpect(status().isNoContent());

		String token = registerAndLogin("cr-delete");
		MvcResult result = mockMvc.perform(get("/api/tura/curated-routes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		assertThat(result.getResponse().getContentAsString()).doesNotContain(id.toString());
	}

	@Test
	void delete_requiresTheAdminApiKey_notABearerToken() throws Exception {
		stubFlatElevation();
		UUID id = UUID.randomUUID();
		upsert(request(id, "Védett túra", "EASY", "HIKING", shortCoordinates())).andExpect(status().isOk());

		String token = registerAndLogin("cr-delete-no-admin-key");
		mockMvc.perform(delete("/api/admin/tura/curated-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isUnauthorized());
	}

	private void stubFlatElevation() {
		when(elevationClient.fetchElevations(any())).thenAnswer(invocation -> {
			@SuppressWarnings("unchecked")
			List<double[]> points = (List<double[]>) invocation.getArgument(0);
			return points.stream().map(point -> 500.0).toList();
		});
	}

	private static List<List<BigDecimal>> shortCoordinates() {
		return List.of(List.of(BigDecimal.valueOf(19.000), BigDecimal.valueOf(47.000)),
				List.of(BigDecimal.valueOf(19.001), BigDecimal.valueOf(47.001)));
	}

	private static List<List<BigDecimal>> longCoordinates() {
		return List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)), List.of(BigDecimal.valueOf(20.0), BigDecimal.valueOf(48.0)));
	}

	private static CuratedRouteUpsertRequest request(UUID id, String name, String difficulty, String activityType,
			List<List<BigDecimal>> coordinates) {
		return new CuratedRouteUpsertRequest(id, name,
				hu.bumler.lm2.api.model.CuratedRouteDifficulty.fromValue(difficulty),
				hu.bumler.lm2.api.model.CuratedRouteActivityType.fromValue(activityType), coordinates);
	}

	private ResultActions upsert(CuratedRouteUpsertRequest request) throws Exception {
		return mockMvc.perform(post("/api/admin/tura/curated-routes").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key").content(json(request)));
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
