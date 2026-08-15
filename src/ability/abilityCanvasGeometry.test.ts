import { describe, expect, it } from 'vitest';
import { buildAlignedOrthogonalPath } from './abilityCanvasGeometry';

describe('aligned orthogonal edge geometry', () => {
  it('routes through the shared branch bus and stops before the target handle', () => {
    expect(buildAlignedOrthogonalPath({
      sourceX: 176,
      sourceY: 40,
      targetX: 272,
      targetY: 184,
      branchX: 224
    })).toBe('M 176 40 H 215 Q 224 40 224 49 V 175 Q 224 184 233 184 H 260');
  });

  it('uses the same 9px corner radius for an upward branch', () => {
    expect(buildAlignedOrthogonalPath({
      sourceX: 176,
      sourceY: 328,
      targetX: 272,
      targetY: 184,
      branchX: 224
    })).toBe('M 176 328 H 215 Q 224 328 224 319 V 193 Q 224 184 233 184 H 260');
  });

  it('keeps a level connection straight while preserving target clearance', () => {
    expect(buildAlignedOrthogonalPath({
      sourceX: 176,
      sourceY: 40,
      targetX: 272,
      targetY: 40,
      branchX: 224
    })).toBe('M 176 40 L 272 40');
  });

  it('returns from an outer branch bus to a target dragged left of its parent', () => {
    expect(buildAlignedOrthogonalPath({
      sourceX: 1160,
      sourceY: 520,
      targetX: 800,
      targetY: 372,
      branchX: 1384
    })).toBe('M 1160 520 H 1375 Q 1384 520 1384 511 V 381 Q 1384 372 1375 372 H 788');
  });
});
