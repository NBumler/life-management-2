package hu.bumler.lm2.auth;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import org.springframework.http.MediaType;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fasterxml.jackson.databind.ObjectMapper;

import hu.bumler.lm2.api.model.ApiError;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * documentation/Features/Bejelentkezés.md: /api/admin/** is gated by X-Admin-Api-Key, not a JWT role.
 *
 * Deliberately NOT a {@code @Component} — see {@link JwtAuthenticationFilter}'s Javadoc for why.
 */
class AdminApiKeyFilter extends OncePerRequestFilter {

	private final String expectedApiKey;
	private final ObjectMapper objectMapper;

	AdminApiKeyFilter(String expectedApiKey, ObjectMapper objectMapper) {
		this.expectedApiKey = expectedApiKey;
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		if (!request.getRequestURI().startsWith("/api/admin/")) {
			chain.doFilter(request, response);
			return;
		}
		String provided = request.getHeader("X-Admin-Api-Key");
		if (provided == null || !MessageDigest.isEqual(provided.getBytes(StandardCharsets.UTF_8),
				expectedApiKey.getBytes(StandardCharsets.UTF_8))) {
			response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			objectMapper.writeValue(response.getWriter(),
					new ApiError("UNAUTHORIZED", "Missing or invalid X-Admin-Api-Key"));
			return;
		}
		chain.doFilter(request, response);
	}
}
