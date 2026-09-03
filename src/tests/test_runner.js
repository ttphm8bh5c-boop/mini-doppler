/**
 * Standalone test runner capable of executing via macOS JXA (osascript)
 * or bundled into browser test suite.
 */

import { runTests } from './clinical.test.js';

// Safe logger for environments like JXA where console.error may be undefined
const safeLog = (typeof console !== 'undefined' && console.log) ? console.log.bind(console) : function() {};
const safeError = (typeof console !== 'undefined' && console.error) ? console.error.bind(console) : safeLog;

class AssertHarness {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.currentSuite = '';
    this.results = [];
  }

  describe(suiteName, fn) {
    this.currentSuite = suiteName;
    safeLog(`\n--- ${suiteName} ---`);
    try {
      fn();
    } catch (err) {
      this.failed++;
      safeError(`  [SUITE ERROR] in "${suiteName}": ${err.message}`);
      this.results.push({ suite: suiteName, name: 'Suite Execution', ok: false, error: err.message });
    }
  }

  equal(actual, expected, message) {
    if (actual === expected) {
      this.passed++;
      safeLog(`  ✓ ${message}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: true });
    } else {
      this.failed++;
      const err = `Expected ${expected}, got ${actual}`;
      safeError(`  ✗ ${message} -> ${err}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: false, error: err });
    }
  }

  closeTo(actual, expected, delta, message) {
    const diff = Math.abs(actual - expected);
    if (diff <= delta) {
      this.passed++;
      safeLog(`  ✓ ${message}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: true });
    } else {
      this.failed++;
      const err = `Expected ${expected} (±${delta}), got ${actual} (diff: ${diff})`;
      safeError(`  ✗ ${message} -> ${err}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: false, error: err });
    }
  }

  isTrue(val, message) {
    this.equal(Boolean(val), true, message);
  }

  isFalse(val, message) {
    this.equal(Boolean(val), false, message);
  }

  throws(fn, errorType, message) {
    let threw = false;
    let thrownError = null;
    try {
      fn();
    } catch (err) {
      threw = true;
      thrownError = err;
    }

    if (threw && (!errorType || thrownError instanceof errorType)) {
      this.passed++;
      safeLog(`  ✓ ${message}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: true });
    } else {
      this.failed++;
      const err = threw
        ? `Expected error of type ${errorType?.name || 'Error'}, got ${thrownError?.name}`
        : `Expected function to throw, but it did not throw`;
      safeError(`  ✗ ${message} -> ${err}`);
      this.results.push({ suite: this.currentSuite, name: message, ok: false, error: err });
    }
  }
}

export function executeAllTests() {
  const harness = new AssertHarness();
  runTests(harness);

  safeLog(`\n========================================`);
  safeLog(`TOTAL TESTS: ${harness.passed + harness.failed}`);
  safeLog(`PASSED: ${harness.passed}`);
  safeLog(`FAILED: ${harness.failed}`);
  safeLog(`========================================\n`);

  return harness;
}
