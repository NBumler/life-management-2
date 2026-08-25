import { chlorideFromSaltAndSodium, sodiumFromSalt } from './salt-sodium-chloride';

describe('sodiumFromSalt', () => {
  it('divides by 2.5 (EU rule: salt = sodium x 2.5)', () => {
    expect(sodiumFromSalt(2.5)).toBe(1);
  });

  it('rounds to 3 decimals', () => {
    expect(sodiumFromSalt(1)).toBe(0.4);
  });
});

describe('chlorideFromSaltAndSodium', () => {
  it('is the NaCl remainder of salt minus sodium', () => {
    expect(chlorideFromSaltAndSodium(2.5, 1)).toBe(1.5);
  });

  it('rounds to 3 decimals', () => {
    expect(chlorideFromSaltAndSodium(1, 0.4)).toBe(0.6);
  });
});
