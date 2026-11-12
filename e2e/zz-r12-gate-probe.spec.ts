// TEMPORARY (ci/r12 only): an intentional failure to prove that a failing E2E run blocks the deploy. Reverted before review.
import { expect, test } from '@playwright/test';

test('R-12 deploy-gate probe (intentional failure)', () => {
  expect(1, 'intentional failure: the deploy gate must stop here').toBe(2);
});
