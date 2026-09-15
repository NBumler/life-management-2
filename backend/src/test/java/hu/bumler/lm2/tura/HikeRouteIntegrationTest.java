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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.ElevationProfilePoint;
import hu.bumler.lm2.api.model.HikeRoute;
import hu.bumler.lm2.api.model.HikeRouteDay;
import hu.bumler.lm2.api.model.LoginRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/tura-utvonaltervezo/103-... 2.1 fázis. Mirrors RecurringExpenseIntegrationTest's coverage
 * for a fresh flat, user-owned, synced entity, plus the two hike-route-specific validations (blank
 * name, fewer than 2 waypoints).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class HikeRouteIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	private static HikeRoute route(UUID id) {
		return new HikeRoute(id, "Kilátó túra",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)),
						List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1))),
				false);
	}

	/** backlog/tura-utvonaltervezo/103-... 2.4 fázis — 3 waypoint, hogy legyen egy belső töréspont a napokra bontáshoz. */
	private static HikeRoute threePointRoute(UUID id) {
		return new HikeRoute(id, "Kétnapos túra",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)),
						List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1)),
						List.of(BigDecimal.valueOf(19.2), BigDecimal.valueOf(47.2))),
				false);
	}

	@Test
	void createIsIdempotent_whenTheSameIdIsPostedTwice() throws Exception {
		String token = registerAndLogin("hr-idempotent");
		HikeRoute body = route(UUID.randomUUID());

		createRoute(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kilátó túra"));
		createRoute(token, body).andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Kilátó túra"));
	}

	@Test
	void create_rejectsBlankName() throws Exception {
		String token = registerAndLogin("hr-blank-name");
		HikeRoute body = route(UUID.randomUUID());
		body.setName("   ");

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("name"));
	}

	@Test
	void create_rejectsFewerThanTwoWaypoints() throws Exception {
		String token = registerAndLogin("hr-one-point");
		HikeRoute body = route(UUID.randomUUID());
		body.setCoordinates(List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0))));

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("coordinates"));
	}

	@Test
	void update_returnsEntityDeleted_afterTheRouteWasDeleted() throws Exception {
		String token = registerAndLogin("hr-entity-deleted");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());
		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		HikeRoute changed = route(id);
		changed.setName("Kilátó túra 2");
		mockMvc.perform(put("/api/hike-routes/" + id).contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token).content(json(changed)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ENTITY_DELETED"));
	}

	@Test
	void delete_isIdempotent_andOwnDeletedRowStillReturns200OnGet() throws Exception {
		String token = registerAndLogin("hr-del-idempotent");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());

		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());
		mockMvc.perform(delete("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk());

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.deleted").value(true));
	}

	@Test
	void get_returnsNotFound_whenRouteBelongsToAnotherUser() throws Exception {
		String tokenA = registerAndLogin("hr-owner-a");
		String tokenB = registerAndLogin("hr-attacker-b");
		UUID id = UUID.randomUUID();
		createRoute(tokenA, route(id)).andExpect(status().isOk());

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
				.andExpect(status().isNotFound());
	}

	@Test
	void create_persistsAndReturnsTheClientComputedMetrics() throws Exception {
		String token = registerAndLogin("hr-metrics");
		UUID id = UUID.randomUUID();
		HikeRoute body = route(id);
		body.distanceMeters(BigDecimal.valueOf(1234.5));
		body.elevationGainMeters(BigDecimal.valueOf(120.0));
		body.elevationLossMeters(BigDecimal.valueOf(45.0));
		body.estimatedDurationMinutes(BigDecimal.valueOf(90));
		body.elevationProfile(List.of(new ElevationProfilePoint(BigDecimal.ZERO, BigDecimal.valueOf(300.0)),
				new ElevationProfilePoint(BigDecimal.valueOf(1234.5), BigDecimal.valueOf(375.0))));

		createRoute(token, body).andExpect(status().isOk())
				.andExpect(jsonPath("$.distanceMeters").value(1234.5))
				.andExpect(jsonPath("$.elevationGainMeters").value(120.0))
				.andExpect(jsonPath("$.elevationLossMeters").value(45.0))
				.andExpect(jsonPath("$.estimatedDurationMinutes").value(90))
				.andExpect(jsonPath("$.elevationProfile.length()").value(2))
				.andExpect(jsonPath("$.elevationProfile[1].elevationMeters").value(375.0));

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.distanceMeters").value(1234.5));
	}

	@Test
	void create_leavesMetricsNull_whenTheClientDidNotComputeThem() throws Exception {
		String token = registerAndLogin("hr-no-metrics");
		HikeRoute body = route(UUID.randomUUID());

		createRoute(token, body).andExpect(status().isOk())
				.andExpect(jsonPath("$.distanceMeters").value(org.hamcrest.Matchers.nullValue()))
				.andExpect(jsonPath("$.elevationProfile").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void create_persistsAndReturnsMultiDaySplit_withOvernightPointAndPerDayMetrics() throws Exception {
		String token = registerAndLogin("hr-days");
		UUID id = UUID.randomUUID();
		HikeRoute body = threePointRoute(id);
		HikeRouteDay day1 = new HikeRouteDay(1);
		day1.overnightName("Kékestetői turistaház");
		day1.distanceMeters(BigDecimal.valueOf(800));
		HikeRouteDay day2 = new HikeRouteDay(2);
		day2.distanceMeters(BigDecimal.valueOf(600));
		body.days(List.of(day1, day2));

		createRoute(token, body).andExpect(status().isOk())
				.andExpect(jsonPath("$.days.length()").value(2))
				.andExpect(jsonPath("$.days[0].endWaypointIndex").value(1))
				.andExpect(jsonPath("$.days[0].overnightName").value("Kékestetői turistaház"))
				.andExpect(jsonPath("$.days[0].distanceMeters").value(800))
				.andExpect(jsonPath("$.days[1].endWaypointIndex").value(2));

		mockMvc.perform(get("/api/hike-routes/" + id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.days.length()").value(2));
	}

	@Test
	void create_leavesDaysNull_whenTheRouteIsSingleDay() throws Exception {
		String token = registerAndLogin("hr-no-days");
		HikeRoute body = route(UUID.randomUUID());

		createRoute(token, body).andExpect(status().isOk())
				.andExpect(jsonPath("$.days").value(org.hamcrest.Matchers.nullValue()));
	}

	@Test
	void create_rejectsDaySplit_whenEndWaypointIndexesAreNotStrictlyIncreasing() throws Exception {
		String token = registerAndLogin("hr-days-not-increasing");
		HikeRoute body = threePointRoute(UUID.randomUUID());
		body.days(List.of(new HikeRouteDay(1), new HikeRouteDay(1)));

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("days"));
	}

	@Test
	void create_rejectsDaySplit_whenTheLastDayDoesNotReachTheRouteEnd() throws Exception {
		String token = registerAndLogin("hr-days-short");
		HikeRoute body = threePointRoute(UUID.randomUUID());
		body.days(List.of(new HikeRouteDay(1)));

		createRoute(token, body)
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
				.andExpect(jsonPath("$.field").value("days"));
	}

	@Test
	void createdRoute_appearsInTheDeltaPull() throws Exception {
		String token = registerAndLogin("hr-sync-delta");
		UUID id = UUID.randomUUID();
		createRoute(token, route(id)).andExpect(status().isOk());

		MvcResult result = mockMvc
				.perform(get("/api/sync/changes").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
				.andExpect(status().isOk()).andReturn();
		String body = result.getResponse().getContentAsString();

		assertThat(body).contains(id.toString()).contains("\"entityType\":\"HikeRoute\"");
	}

	private ResultActions createRoute(String token, HikeRoute body) throws Exception {
		return mockMvc.perform(post("/api/hike-routes").contentType(MediaType.APPLICATION_JSON)
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
