import {
  UNDER_25_SZJA_EXEMPTION_CAP_HUF,
  computeNetPay,
} from './net-pay-calculator';

const TODAY = '2026-06-15';

describe('computeNetPay', () => {
  it('is not computable when gross is missing', () => {
    expect(computeNetPay({ grossMonthlySalaryHuf: null, birthDate: '2000-01-01' }, TODAY)).toEqual({
      computable: false,
    });
  });

  it('treats a filled-in 0 gross as computable', () => {
    expect(computeNetPay({ grossMonthlySalaryHuf: 0, birthDate: null }, TODAY)).toEqual({
      computable: true,
      gross: 0,
      tb: 0,
      szja: 0,
      net: 0,
      under25ExemptionApplied: false,
    });
  });

  it('applies full SZJA when birthDate is missing', () => {
    // gross 500000: tb = round(0.185 * 500000) = 92500; szja = round(0.15 * 500000) = 75000
    expect(computeNetPay({ grossMonthlySalaryHuf: 500_000, birthDate: null }, TODAY)).toEqual({
      computable: true,
      gross: 500_000,
      tb: 92_500,
      szja: 75_000,
      net: 332_500,
      under25ExemptionApplied: false,
    });
  });

  it('applies full SZJA for age >= 25', () => {
    // born 2000-06-15 → exactly 26 on TODAY
    const result = computeNetPay({ grossMonthlySalaryHuf: 500_000, birthDate: '2000-06-15' }, TODAY);
    expect(result.computable && result.szja).toBe(75_000);
    expect(result.computable && result.under25ExemptionApplied).toBe(false);
  });

  it('zeroes SZJA for an under-25 whose gross is under the cap', () => {
    // born 2005-01-01 → 21 on TODAY; gross below the 715_765 cap → szja base 0
    const result = computeNetPay({ grossMonthlySalaryHuf: 500_000, birthDate: '2005-01-01' }, TODAY);
    expect(result).toEqual({
      computable: true,
      gross: 500_000,
      tb: 92_500,
      szja: 0,
      net: 407_500,
      under25ExemptionApplied: true,
    });
  });

  it('leaves residual SZJA for an under-25 above the cap, flag still true', () => {
    const gross = UNDER_25_SZJA_EXEMPTION_CAP_HUF + 200_000;
    const result = computeNetPay({ grossMonthlySalaryHuf: gross, birthDate: '2005-01-01' }, TODAY);
    expect(result.computable && result.szja).toBe(Math.round(0.15 * 200_000)); // 30000
    expect(result.computable && result.under25ExemptionApplied).toBe(true);
  });

  it('ends the allowance on the 25th birthday', () => {
    // born exactly 25 years before TODAY → age 25, no longer under 25
    const result = computeNetPay({ grossMonthlySalaryHuf: 500_000, birthDate: '2001-06-15' }, TODAY);
    expect(result.computable && result.under25ExemptionApplied).toBe(false);
    expect(result.computable && result.szja).toBe(75_000);
  });

  it('rounds each item half-up independently', () => {
    // gross 333333: tb = round(61666.605) = 61667; szja = round(49999.95) = 50000
    const result = computeNetPay({ grossMonthlySalaryHuf: 333_333, birthDate: null }, TODAY);
    expect(result.computable && result.tb).toBe(61_667);
    expect(result.computable && result.szja).toBe(50_000);
    expect(result.computable && result.net).toBe(333_333 - 61_667 - 50_000);
  });
});
