package hu.bumler.lm2.auth;

import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hu.bumler.lm2.common.exception.EntityNotFoundException;
import hu.bumler.lm2.common.exception.UniqueViolationException;

/** documentation/Features/Bejelentkezés.md "Admin curl" — no self-service registration or reset. */
@Service
class AdminUserService {

	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordEncoder passwordEncoder;

	AdminUserService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
			PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	User createUser(String username, String rawPassword) {
		if (userRepository.existsByUsername(username)) {
			throw new UniqueViolationException("Username already taken", "username", null);
		}
		User user = new User(UUID.randomUUID(), username, passwordEncoder.encode(rawPassword));
		// flush, not save: the DB trigger sets created_at/updated_at, and Hibernate only reads
		// @Generated values back once the statement has actually been sent.
		return userRepository.saveAndFlush(user);
	}

	@Transactional
	void setPassword(String username, String rawPassword) {
		User user = userRepository.findByUsername(username)
				.orElseThrow(() -> new EntityNotFoundException("No such user: " + username));
		user.setPasswordHash(passwordEncoder.encode(rawPassword));
		// Password change revokes every device's session (security minimum) — Bejelentkezés.md.
		refreshTokenRepository.findByUserIdAndRevokedAtIsNull(user.getId()).forEach(RefreshToken::revoke);
	}
}
