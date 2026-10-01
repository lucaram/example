export type Label = 'pass' | 'fail';

export interface Agreement {
  n: number;
  agreement: number;
  kappa: number;
  confusion: { bothPass: number; bothFail: number; judgePassHumanFail: number; judgeFailHumanPass: number };
}

/** Raw agreement and Cohen's kappa (agreement corrected for chance) between the judge and a human. */
export function compare(judge: Label[], human: Label[]): Agreement {
  if (judge.length !== human.length || judge.length === 0) throw new Error('compare needs two equal-length, non-empty lists');
  const n = judge.length;
  const confusion = { bothPass: 0, bothFail: 0, judgePassHumanFail: 0, judgeFailHumanPass: 0 };
  for (let i = 0; i < n; i++) {
    if (judge[i] === 'pass' && human[i] === 'pass') confusion.bothPass++;
    else if (judge[i] === 'fail' && human[i] === 'fail') confusion.bothFail++;
    else if (judge[i] === 'pass') confusion.judgePassHumanFail++;
    else confusion.judgeFailHumanPass++;
  }
  const po = (confusion.bothPass + confusion.bothFail) / n;
  const judgePass = (confusion.bothPass + confusion.judgePassHumanFail) / n;
  const humanPass = (confusion.bothPass + confusion.judgeFailHumanPass) / n;
  const pe = judgePass * humanPass + (1 - judgePass) * (1 - humanPass);
  const kappa = pe === 1 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe);
  return { n, agreement: po, kappa, confusion };
}
