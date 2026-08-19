package hu.bumler.lm2.auth;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;

/** documentation/Features/Bejelentkezés.md "Stack / mechanizmus": short-lived JWT access token. */
@Component
class JwtService {

	private static final Duration ACCESS_TOKEN_TTL = Duration.ofMinutes(30);

	private final SecretKey key;

	JwtService(@Value("${lm2.jwt.secret}") String secret) {
		this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
	}

	String issueAccessToken(UUID userId, String username) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(userId.toString())
				.claim("username", username)
				.claim("role", "USER")
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plus(ACCESS_TOKEN_TTL)))
				.signWith(key)
				.compact();
	}

	long accessTokenTtlSeconds() {
		return ACCESS_TOKEN_TTL.toSeconds();
	}

	/** @return the claims if the token is well-formed, signed by us, and not expired; empty otherwise. */
	java.util.Optional<Claims> tryParse(String token) {
		try {
			return java.util.Optional.of(Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload());
		} catch (JwtException | IllegalArgumentException e) {
			return java.util.Optional.empty();
		}
	}
}
