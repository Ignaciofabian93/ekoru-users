/**
 * How a new paid term fits around the terms a seller already holds (USR-16).
 *
 * A buyer picks a plan and how many months (one membership row per term
 * length). Money only ever moves forward:
 *
 * - **No live term:** the term starts now.
 * - **Same plan:** it extends, starting when the last held term ends, so
 *   renewing early never throws away paid days.
 * - **Higher plan:** it starts now, the held terms end now, and their unused
 *   value becomes extra days on the new plan. Nobody pays twice for the same
 *   days, so there's no reason to wait for the old term to run out.
 * - **Lower plan:** refused while a term runs (`canBuy`, checked before
 *   the payment). If one is paid anyway, it is queued after the held terms
 *   rather than dropped: the money was already taken.
 *
 * Pure functions, so the rules are tested without a database.
 */

export type MembershipKind = 'person' | 'business';

/** Plans from lowest to highest, mirroring the Prisma enums. */
const PLAN_ORDER: Record<MembershipKind, readonly string[]> = {
  person: ['FREEMIUM', 'BASIC', 'ADVANCED'],
  business: ['FREEMIUM', 'STARTUP', 'BASIC', 'ADVANCED', 'EXPERT'],
};

export function planRank(kind: MembershipKind, plan: string): number {
  return PLAN_ORDER[kind].indexOf(plan);
}

/** A term the seller already holds. `price` is what one such term costs now. */
export interface HeldTerm {
  id: number;
  plan: string;
  startDate: Date;
  endDate: Date | null;
  price: number | null;
}

export interface NewTerm {
  plan: string;
  durationMonths: number;
  price: number | null;
}

export type TermChange = 'NEW' | 'EXTEND' | 'UPGRADE' | 'QUEUE';

export interface TermSchedule {
  change: TermChange;
  startDate: Date;
  endDate: Date;
  /** Held terms the new one replaces; they end at `now`. */
  endNow: number[];
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

/** Held terms that haven't ended yet. */
export function liveTerms(held: HeldTerm[], now: Date): HeldTerm[] {
  return held.filter((t) => t.endDate === null || t.endDate > now);
}

/** The term in force now, or the earliest live one when none has started. */
export function currentTerm(held: HeldTerm[], now: Date): HeldTerm | null {
  const live = liveTerms(held, now);
  const started = live
    .filter((t) => t.startDate <= now)
    .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  if (started.length) return started[0];
  return (
    live.sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ??
    null
  );
}

/**
 * Whether `plan` can be bought now. A lower plan than the one in force is
 * refused until it ends; the free plan counts as the lowest.
 */
export function canBuy(
  kind: MembershipKind,
  held: HeldTerm[],
  plan: string,
  now: Date,
): boolean {
  const current = currentTerm(held, now);
  if (!current) return true;
  return planRank(kind, plan) >= planRank(kind, current.plan);
}

/** What the unused part of a held term is worth, at its plan's price. */
function unusedValue(term: HeldTerm, now: Date): number {
  if (!term.endDate || !term.price) return 0;
  const total = term.endDate.getTime() - term.startDate.getTime();
  if (total <= 0) return 0;
  const from = Math.max(term.startDate.getTime(), now.getTime());
  const unused = Math.max(term.endDate.getTime() - from, 0);
  return (term.price * unused) / total;
}

export function scheduleTerm(
  kind: MembershipKind,
  held: HeldTerm[],
  next: NewTerm,
  now: Date,
): TermSchedule {
  const live = liveTerms(held, now);
  const current = currentTerm(held, now);
  if (!current) {
    return {
      change: 'NEW',
      startDate: now,
      endDate: addMonths(now, next.durationMonths),
      endNow: [],
    };
  }

  const nextRank = planRank(kind, next.plan);
  const currentRank = planRank(kind, current.plan);

  if (nextRank > currentRank) {
    const plainEnd = addMonths(now, next.durationMonths);
    const credit = live.reduce((sum, t) => sum + unusedValue(t, now), 0);
    const length = plainEnd.getTime() - now.getTime();
    const extraMs =
      next.price && credit > 0 ? Math.round((credit / next.price) * length) : 0;
    return {
      change: 'UPGRADE',
      startDate: now,
      endDate: new Date(plainEnd.getTime() + extraMs),
      endNow: live.map((t) => t.id),
    };
  }

  // Same plan extends, a lower one waits: both start when the last live term
  // ends. An open-ended term (no end date) can't be chained after.
  const lastEnd = live.reduce(
    (latest, t) => (t.endDate && t.endDate > latest ? t.endDate : latest),
    now,
  );
  return {
    change: nextRank === currentRank ? 'EXTEND' : 'QUEUE',
    startDate: lastEnd,
    endDate: addMonths(lastEnd, next.durationMonths),
    endNow: [],
  };
}
