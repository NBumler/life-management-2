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
 * backlog/tura-utvonaltervezo/103-... / 104-... — 1. fázis: admin import + bbox lekérdezés.
 * Shared/global referenceadat (nincs user_id), a Food mintát követve regisztrál egy usert a
 * bbox endpoint bearer-tokenjéhez, de az import a Food-tól eltérően admin API-key-jel megy.
 */
@Import(TestcontainersConfiguration.class)
@AutoConfigureMockMvc
@SpringBootTest
class TrailSegmentIntegrationTest {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void importThenBboxQuery_returnsTheImportedSegment_whenItOverlapsTheQueriedBbox() throws Exception {
		String countryCode = "H1"; // izolált teszt-országkód, hogy más tesztek importjával ne ütközzön
		TrailSegmentImportItem item = new TrailSegmentImportItem("PIROS_SAV",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)), List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1))));

		importSegments(countryCode, List.of(item)).andExpect(status().isOk());

		String token = registerAndLogin("tura-bbox");
		MvcResult result = mockMvc
				.perform(get("/api/tura/trail-segments").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.param("country", countryCode)
						.param("minLon", "18.9").param("minLat", "46.9").param("maxLon", "19.2").param("maxLat", "47.2"))
				.andExpect(status().isOk()).andReturn();

		String body = result.getResponse().getContentAsString();
		assertThat(body).contains("PIROS_SAV");
	}

	@Test
	void bboxQuery_excludesSegments_outsideTheQueriedBbox() throws Exception {
		String countryCode = "H2";
		TrailSegmentImportItem farAway = new TrailSegmentImportItem("KEK_SAV",
				List.of(List.of(BigDecimal.valueOf(0.0), BigDecimal.valueOf(0.0)), List.of(BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.1))));
		importSegments(countryCode, List.of(farAway)).andExpect(status().isOk());

		String token = registerAndLogin("tura-bbox-exclude");
		MvcResult result = mockMvc
				.perform(get("/api/tura/trail-segments").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.param("country", countryCode)
						.param("minLon", "18.9").param("minLat", "46.9").param("maxLon", "19.2").param("maxLat", "47.2"))
				.andExpect(status().isOk()).andReturn();

		assertThat(result.getResponse().getContentAsString()).doesNotContain("KEK_SAV");
	}

	@Test
	void reimport_replacesThePreviousSetForThatCountryCode() throws Exception {
		String countryCode = "H3";
		TrailSegmentImportItem first = new TrailSegmentImportItem("SARGA_SAV",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)), List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1))));
		importSegments(countryCode, List.of(first)).andExpect(status().isOk());

		TrailSegmentImportItem second = new TrailSegmentImportItem("ZOLD_SAV",
				List.of(List.of(BigDecimal.valueOf(19.0), BigDecimal.valueOf(47.0)), List.of(BigDecimal.valueOf(19.1), BigDecimal.valueOf(47.1))));
		importSegments(countryCode, List.of(second)).andExpect(status().isOk());

		String token = registerAndLogin("tura-reimport");
		MvcResult result = mockMvc
				.perform(get("/api/tura/trail-segments").header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
						.param("country", countryCode)
						.param("minLon", "18.9").param("minLat", "46.9").param("maxLon", "19.2").param("maxLat", "47.2"))
				.andExpect(status().isOk()).andReturn();

		String body = result.getResponse().getContentAsString();
		assertThat(body).contains("ZOLD_SAV").doesNotContain("SARGA_SAV");
	}

	@Test
	void import_requiresTheAdminApiKey_notABearerToken() throws Exception {
		String token = registerAndLogin("tura-no-admin-key");
		TrailSegmentImportRequest request = new TrailSegmentImportRequest("H4", List.of());

		mockMvc.perform(post("/api/admin/tura/trail-segments/import").contentType(MediaType.APPLICATION_JSON)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
				.content(json(request)))
				.andExpect(status().isUnauthorized());
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
