import {
  addMonths,
  canBuy,
  currentTerm,
  scheduleTerm,
  type HeldTerm,
} from './membership-terms';

const NOW = new Date('2026-11-03T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

const term = (over: Partial<HeldTerm> = {}): HeldTerm => ({
  id: 1,
  plan: 'STARTUP',
  startDate: new Date(NOW.getTime() - 10 * DAY),
  endDate: new Date(NOW.getTime() + 20 * DAY),
  price: 1000,
  ...over,
});

describe('membership terms (USR-16)', () => {
  it('starts now when nothing is held', () => {
    const t = scheduleTerm(
      'business',
      [],
      { plan: 'STARTUP', durationMonths: 6, price: 5400 },
      NOW,
    );
    expect(t).toEqual({
      change: 'NEW',
      startDate: NOW,
      endDate: addMonths(NOW, 6),
      endNow: [],
    });
  });

  it('ignores terms that already ended', () => {
    const ended = term({ endDate: new Date(NOW.getTime() - DAY) });
    expect(
      scheduleTerm(
        'business',
        [ended],
        { plan: 'BASIC', durationMonths: 1, price: 2000 },
        NOW,
      ).change,
    ).toBe('NEW');
  });

  it('extends the same plan from the last end date, chained', () => {
    const first = term();
    const queued = term({
      id: 2,
      startDate: first.endDate!,
      endDate: addMonths(first.endDate!, 1),
    });
    const t = scheduleTerm(
      'business',
      [first, queued],
      { plan: 'STARTUP', durationMonths: 12, price: 9600 },
      NOW,
    );
    expect(t.change).toBe('EXTEND');
    expect(t.startDate).toEqual(queued.endDate);
    expect(t.endDate).toEqual(addMonths(queued.endDate!, 12));
    expect(t.endNow).toEqual([]);
  });

  it('upgrades now and turns the unused value into extra days', () => {
    // 20 of 30 days left of a $1.000 term: $666,67 of credit. The new plan
    // costs $2.000 a month, so the credit buys a third of a month more.
    const held = term();
    const t = scheduleTerm(
      'business',
      [held],
      { plan: 'BASIC', durationMonths: 1, price: 2000 },
      NOW,
    );
    const month = addMonths(NOW, 1).getTime() - NOW.getTime();
    expect(t.change).toBe('UPGRADE');
    expect(t.startDate).toEqual(NOW);
    expect(t.endNow).toEqual([held.id]);
    const extra = t.endDate.getTime() - addMonths(NOW, 1).getTime();
    expect(extra / month).toBeCloseTo(1 / 3, 3);
  });

  it('counts a prepaid extension in the upgrade credit', () => {
    const first = term();
    const queued = term({
      id: 2,
      startDate: first.endDate!,
      endDate: new Date(first.endDate!.getTime() + 30 * DAY),
    });
    const t = scheduleTerm(
      'business',
      [first, queued],
      { plan: 'BASIC', durationMonths: 1, price: 2000 },
      NOW,
    );
    expect(t.endNow).toEqual([1, 2]);
    // $666,67 + $1.000 of credit = 5/6 of a $2.000 month.
    const month = addMonths(NOW, 1).getTime() - NOW.getTime();
    const extra = t.endDate.getTime() - addMonths(NOW, 1).getTime();
    expect(extra / month).toBeCloseTo(5 / 6, 3);
  });

  it('gives no credit for the free plan', () => {
    const free = term({ plan: 'FREEMIUM', price: 0 });
    const t = scheduleTerm(
      'business',
      [free],
      { plan: 'STARTUP', durationMonths: 1, price: 1000 },
      NOW,
    );
    expect(t.change).toBe('UPGRADE');
    expect(t.endDate).toEqual(addMonths(NOW, 1));
  });

  it('queues a lower plan that was paid anyway after the held terms', () => {
    const held = term({ plan: 'BASIC' });
    const t = scheduleTerm(
      'business',
      [held],
      { plan: 'STARTUP', durationMonths: 1, price: 1000 },
      NOW,
    );
    expect(t.change).toBe('QUEUE');
    expect(t.startDate).toEqual(held.endDate);
  });

  it('allows the same or a higher plan, never a lower one, while a term runs', () => {
    const held = [term({ plan: 'BASIC' })];
    expect(canBuy('business', held, 'BASIC', NOW)).toBe(true);
    expect(canBuy('business', held, 'EXPERT', NOW)).toBe(true);
    expect(canBuy('business', held, 'STARTUP', NOW)).toBe(false);
    expect(canBuy('business', held, 'FREEMIUM', NOW)).toBe(false);
    expect(canBuy('business', [], 'STARTUP', NOW)).toBe(true);
  });

  it('reads the term in force, not a prepaid one waiting its turn', () => {
    const first = term();
    const queued = term({ id: 2, startDate: first.endDate! });
    expect(currentTerm([queued, first], NOW)?.id).toBe(1);
  });
});
