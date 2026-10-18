import { round3 } from './round';

describe('round3', () => {
  it('backlog/174: strips IEEE-754 subtraction artefacts', () => {
    expect(round3(7 - 4.4)).toBe(2.6);
    expect(round3(1.1 - 0.2)).toBe(0.9);
  });

  it('keeps up to 3 meaningful decimals', () => {
    expect(round3(0.107)).toBe(0.107);
    expect(round3(0.0428)).toBe(0.043);
    expect(round3(18)).toBe(18);
  });
});
