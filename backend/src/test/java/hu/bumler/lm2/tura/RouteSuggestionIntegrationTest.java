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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.TestcontainersConfiguration;
import hu.bumler.lm2.api.model.AdminCreateUserRequest;
import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.api.model.LoginRequest;
import hu.bumler.lm2.api.model.TrailSegmentImportItem;
import hu.bumler.lm2.api.model.TrailSegmentImportRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * backlog/tura-utvonaltervezo/103-... 2.2 fázis — automatikus útvonal-generálás a TrailSegment
 * gráfon. A {@link TrailSegmentIntegrationTest} mintáját követi (izolált, egyedi countryCode
 * teszt-esetenként, hogy más tesztek importjával ne ütközzön).
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class RouteSuggestionIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void suggestsARoute_acrossTwoSegmentsSharingAJunctionVertex() throws Exception {
		String countryCode = "R1";
		// Két szakasz, amik a (19.1, 47.1) csomópontban találkoznak.
		TrailSegmentImportItem first = new TrailSegmentImportItem("PIROS_SAV",
				List.of(point(19.0, 47.0), point(19.1, 47.1)));
		TrailSegmentImportItem second = new TrailSegmentImportItem("PIROS_SAV",
				List.of(point(19.1, 47.1), point(19.2, 47.2)));
		importSegments(countryCode, List.of(first, second)).andExpect(status().isOk());

		JsonNode response = suggestRoute(countryCode, 19.0, 47.0, 19.2, 47.2);

		assertThat(response.get("found").asBoolean()).isTrue();
		assertThat(response.get("coordinates")).hasSize(3);
		assertThat(response.get("distanceMeters").asDouble()).isGreaterThan(0);
	}

	@Test
	void findsNoRoute_betweenTwoDisconnectedTrailIslands() throws Exception {
		String countryCode = "R2";
		TrailSegmentImportItem islandA = new TrailSegmentImportItem("KEK_SAV", List.of(point(19.0, 47.0), point(19.01, 47.01)));
		TrailSegmentImportItem islandB = new TrailSegmentImportItem("KEK_SAV", List.of(point(25.0, 45.0), point(25.01, 45.01)));
		importSegments(countryCode, List.of(islandA, islandB)).andExpect(status().isOk());

		JsonNode response = suggestRoute(countryCode, 19.0, 47.0, 25.0, 45.0);

		assertThat(response.get("found").asBoolean()).isFalse();
		assertThat(response.get("coordinates")).isEmpty();
	}

	@Test
	void findsNoRoute_whenARequestedPointIsFarFromAnyKnownTrail() throws Exception {
		String countryCode = "R3";
		TrailSegmentImportItem segment = new TrailSegmentImportItem("ZOLD_SAV", List.of(point(19.0, 47.0), point(19.1, 47.1)));
		importSegments(countryCode, List.of(segment)).andExpect(status().isOk());

		// A végpont ~100 km-re van a legközelebbi ismert szakasztól — 2 km-es snap-küszöbön kívül.
		JsonNode response = suggestRoute(countryCode, 19.0, 47.0, 20.0, 47.0);

		assertThat(response.get("found").asBoolean()).isFalse();
	}

	private JsonNode suggestRoute(String countryCode, double startLon, double startLat, double endLon, double endLat) throws Exception {
		String token = registerAndLogin("tura-route-suggestion");
		MvcResult result = mockMvc
				.perform(get("/api/tura/route-suggestion").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.param("country", countryCode)
						.param("startLon", String.valueOf(startLon)).param("startLat", String.valueOf(startLat))
						.param("endLon", String.valueOf(endLon)).param("endLat", String.valueOf(endLat)))
				.andExpect(status().isOk()).andReturn();
		return objectMapper.readTree(result.getResponse().getContentAsString());
	}

	private static List<BigDecimal> point(double lon, double lat) {
		return List.of(BigDecimal.valueOf(lon), BigDecimal.valueOf(lat));
	}

	private org.springframework.test.web.servlet.ResultActions importSegments(String countryCode, List<TrailSegmentImportItem> items)
			throws Exception {
		TrailSegmentImportRequest request = new TrailSegmentImportRequest(countryCode, items);
		return mockMvc.perform(post("/api/admin/tura/trail-segments/import").contentType(MediaType.APPLICATION_JSON)
				.header("X-Admin-Api-Key", "test-admin-api-key")
				.content(json(request)));
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
