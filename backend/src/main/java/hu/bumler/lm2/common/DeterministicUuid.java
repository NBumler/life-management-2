package hu.bumler.lm2.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.UUID;

/**
 * Name-based (v5) UUIDs for natural-key entities — the server-side mirror of the frontend's
 * {@code core/sync/uuid.ts}. Byte-for-byte identical: same fixed project namespace, SHA-1 over
 * {@code namespace ++ utf8(name)}, version nibble forced to 5 and the RFC-4122 variant bits set.
 * Used so a lazily-materialised singleton (e.g. {@code AycmSettings}) carries the exact id the
 * client would mint on its first write, and two offline devices converge on it
 * (documentation/Architektúra/Backend-offline first.md §9).
 */
public final class DeterministicUuid {

	/** Must stay identical to {@code PROJECT_NAMESPACE_HEX} in the frontend — never change it. */
	private static final byte[] NAMESPACE = hexToBytes("b8f1d9a06c3e4b7a9e1a9d9e6f2c9d10");

	private DeterministicUuid() {
	}

	public static UUID v5(String name) {
		byte[] hash = sha1(concat(NAMESPACE, name.getBytes(StandardCharsets.UTF_8)));
		hash[6] = (byte) ((hash[6] & 0x0f) | 0x50);
		hash[8] = (byte) ((hash[8] & 0x3f) | 0x80);
		long msb = 0;
		long lsb = 0;
		for (int i = 0; i < 8; i++) {
			msb = (msb << 8) | (hash[i] & 0xff);
		}
		for (int i = 8; i < 16; i++) {
			lsb = (lsb << 8) | (hash[i] & 0xff);
		}
		return new UUID(msb, lsb);
	}

	private static byte[] sha1(byte[] data) {
		try {
			return MessageDigest.getInstance("SHA-1").digest(data);
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-1 not available", e);
		}
	}

	private static byte[] concat(byte[] a, byte[] b) {
		byte[] out = new byte[a.length + b.length];
		System.arraycopy(a, 0, out, 0, a.length);
		System.arraycopy(b, 0, out, a.length, b.length);
		return out;
	}

	private static byte[] hexToBytes(String hex) {
		byte[] out = new byte[hex.length() / 2];
		for (int i = 0; i < out.length; i++) {
			out[i] = (byte) Integer.parseInt(hex.substring(i * 2, i * 2 + 2), 16);
		}
		return out;
	}
}
