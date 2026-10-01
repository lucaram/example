import { describe, expect, it } from 'vitest';
import { compare } from '../../evals/stats.ts';

describe('judge-vs-human agreement', () => {
  it('perfect agreement gives kappa 1', () => {
    const r = compare(['pass', 'fail', 'pass', 'fail'], ['pass', 'fail', 'pass', 'fail']);
    expect(r).toMatchObject({ agreement: 1, kappa: 1 });
  });

  it('total disagreement gives negative kappa', () => {
    expect(compare(['pass', 'fail'], ['fail', 'pass']).kappa).toBeLessThan(0);
  });

  it('corrects for chance: a judge that always says pass has kappa 0 despite 75% raw agreement', () => {
    const r = compare(['pass', 'pass', 'pass', 'pass'], ['pass', 'pass', 'pass', 'fail']);
    expect(r.agreement).toBe(0.75);
    expect(r.kappa).toBe(0);
  });

  it('counts the confusion matrix', () => {
    const r = compare(['pass', 'pass', 'fail'], ['pass', 'fail', 'pass']);
    expect(r.confusion).toEqual({ bothPass: 1, bothFail: 0, judgePassHumanFail: 1, judgeFailHumanPass: 1 });
  });

  it('rejects empty or mismatched input', () => {
    expect(() => compare([], [])).toThrow();
    expect(() => compare(['pass'], [])).toThrow();
  });
});
