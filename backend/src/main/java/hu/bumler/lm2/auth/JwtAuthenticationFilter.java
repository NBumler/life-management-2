package hu.bumler.lm2.auth;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Sets the SecurityContext from a valid `Authorization: Bearer <accessToken>`; otherwise leaves it empty
 * so downstream `authorizeHttpRequests` denies protected routes with 401.
 *
 * Deliberately NOT a {@code @Component}: it's wired into the security filter chain by hand in
 * {@link SecurityConfig}. A Filter bean would additionally get auto-registered as a generic
 * servlet filter by Spring Boot, running it a second time per request.
 */
class JwtAuthenticationFilter extends OncePerRequestFilter {

	private final JwtService jwtService;

	JwtAuthenticationFilter(JwtService jwtService) {
		this.jwtService = jwtService;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		String header = request.getHeader("Authorization");
		if (header != null && header.startsWith("Bearer ")) {
			jwtService.tryParse(header.substring("Bearer ".length())).ifPresent(this::authenticate);
		}
		chain.doFilter(request, response);
	}

	private void authenticate(Claims claims) {
		var authentication = new UsernamePasswordAuthenticationToken(claims.getSubject(), null,
				List.of(new SimpleGrantedAuthority("ROLE_USER")));
		SecurityContextHolder.getContext().setAuthentication(authentication);
	}
}
