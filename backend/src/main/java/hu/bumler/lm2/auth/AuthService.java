package hu.bumler.lm2.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.api.model.AuthTokens;
import hu.bumler.lm2.common.exception.UnauthorizedException;

/** documentation/Features/Bejelentkezés.md — login / refresh (rotation) / logout. */
@Service
class AuthService {

	// Long-lived by design ("gyakorlatilag amíg revoke / jelszócsere"); rotated on every refresh
	// so a device that keeps refreshing effectively never expires.
	private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(180);
	private static final SecureRandom RANDOM = new SecureRandom();

	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtService jwtService;

	AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
			PasswordEncoder passwordEncoder, JwtService jwtService) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.passwordEncoder = passwordEncoder;
		this.jwtService = jwtService;
	}

	@Transactional
	AuthTokens login(String username, String rawPassword) {
		User user = userRepository.findByUsername(username)
				.orElseThrow(() -> new UnauthorizedException("Invalid username or password"));
		if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
			throw new UnauthorizedException("Invalid username or password");
		}
		return issueTokens(user);
	}

	@Transactional
	AuthTokens refresh(String rawRefreshToken) {
		RefreshToken existing = refreshTokenRepository.findByTokenHash(hash(rawRefreshToken))
				.filter(RefreshToken::isUsable)
				.orElseThrow(() -> new UnauthorizedException("Refresh token invalid, expired, or revoked"));
		existing.revoke();
		User user = userRepository.findById(existing.getUserId())
				.orElseThrow(() -> new UnauthorizedException("Refresh token invalid, expired, or revoked"));
		return issueTokens(user);
	}

	@Transactional
	void logout(String rawRefreshToken) {
		refreshTokenRepository.findByTokenHash(hash(rawRefreshToken)).ifPresent(RefreshToken::revoke);
	}

	private AuthTokens issueTokens(User user) {
		String rawRefreshToken = randomToken();
		RefreshToken refreshToken = new RefreshToken(UUID.randomUUID(), user.getId(), hash(rawRefreshToken),
				OffsetDateTime.now().plus(REFRESH_TOKEN_TTL));
		refreshTokenRepository.save(refreshToken);

		String accessToken = jwtService.issueAccessToken(user.getId(), user.getUsername());
		return new AuthTokens(accessToken, rawRefreshToken, jwtService.accessTokenTtlSeconds());
	}

	private static String randomToken() {
		byte[] bytes = new byte[32];
		RANDOM.nextBytes(bytes);
		return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
	}

	private static String hash(String rawToken) {
		try {
			byte[] digest = MessageDigest.getInstance("SHA-256").digest(rawToken.getBytes(StandardCharsets.UTF_8));
			return Base64.getEncoder().encodeToString(digest);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException(e);
		}
	}
}
