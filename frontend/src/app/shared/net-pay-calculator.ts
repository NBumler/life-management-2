/**
 * documentation/Subfeatures/Nettó fizetés kalkulátor.md — pure TS simplified *employee* net-salary
 * estimate from Profile `grossMonthlySalaryHuf` (+ optional `birthDate`). Same "kliens gördíti
 * tovább" shape as `shared/tdee-calculator.ts`: no backend, no own store, missing gross → not
 * computable (`~` on screen), never throws.
 *
 * NOT tax advice. The constants below are hand-maintained — update this file (and the spec) when the
 * law changes. There is no NAV API.
 */
import { ageInYears } from './local-date';

/** TB (társadalombiztosítási) járulék rate on the gross. */
export const TB_RATE = 0.185;
/** SZJA (személyi jövedelemadó) rate on the (post-allowance) base. */
export const SZJA_RATE = 0.15;
/** The under-25 SZJA allowance ends on the 25th birthday (not a NAV month boundary). */
export const UNDER_25_AGE_LIMIT = 25;
/** 2026 official monthly SZJA-exempt cap for under-25s. */
export const UNDER_25_SZJA_EXEMPTION_CAP_HUF = 715_765;

export interface NetPayInput {
  /** Profile.grossMonthlySalaryHuf — null/undefined means "not computable". A filled-in 0 is valid. */
  grossMonthlySalaryHuf: number | null;
  /** Profile.birthDate (YYYY-MM-DD) — optional. Missing → full SZJA, still computable. */
  birthDate: string | null;
}

export interface NetPayResult {
  gross: number;
  tb: number;
  szja: number;
  net: number;
  /** birthDate filled in AND age < 25 — true even if the cap is exceeded and residual SZJA remains. */
  under25ExemptionApplied: boolean;
}

export type NetPayCalculation = ({ computable: true } & NetPayResult) | { computable: false };

/**
 * documentation/Subfeatures/Nettó fizetés kalkulátor.md "Képlet (SSOT)": per-item `Math.round`
 * (0.5 up), then subtraction. `todayIso` is the client calendar day (`YYYY-MM-DD`) for the age check.
 */
export function computeNetPay(input: NetPayInput, todayIso: string): NetPayCalculation {
  const { grossMonthlySalaryHuf: gross, birthDate } = input;
  if (gross === null || gross === undefined) {
    return { computable: false };
  }

  const tb = Math.round(gross * TB_RATE);

  const under25 = birthDate !== null && ageInYears(birthDate, todayIso) < UNDER_25_AGE_LIMIT;
  const szjaBase = under25 ? Math.max(0, gross - UNDER_25_SZJA_EXEMPTION_CAP_HUF) : gross;
  const szja = Math.round(SZJA_RATE * szjaBase);

  return {
    computable: true,
    gross,
    tb,
    szja,
    net: gross - tb - szja,
    under25ExemptionApplied: under25,
  };
}
