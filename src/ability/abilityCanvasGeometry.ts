type AlignedEdgeInput = {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  branchX: number;
  cornerRadius?: number;
  targetGap?: number;
};

function number(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '');
}

export function buildAlignedOrthogonalPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  branchX,
  cornerRadius = 9,
  targetGap = 12
}: AlignedEdgeInput): string {
  const endX = targetX - targetGap;
  if (sourceY === targetY) return `M ${number(sourceX)} ${number(sourceY)} L ${number(targetX)} ${number(targetY)}`;

  const direction = targetY > sourceY ? 1 : -1;
  const radius = Math.min(
    cornerRadius,
    Math.abs(targetY - sourceY) / 2,
    Math.abs(branchX - sourceX),
    Math.abs(endX - branchX)
  );
  const sourceDirection = branchX >= sourceX ? 1 : -1;
  const targetDirection = endX >= branchX ? 1 : -1;
  const beforeBranch = branchX - sourceDirection * radius;
  const branchStartY = sourceY + direction * radius;
  const branchEndY = targetY - direction * radius;
  const afterBranch = branchX + targetDirection * radius;

  return [
    `M ${number(sourceX)} ${number(sourceY)}`,
    `H ${number(beforeBranch)}`,
    `Q ${number(branchX)} ${number(sourceY)} ${number(branchX)} ${number(branchStartY)}`,
    `V ${number(branchEndY)}`,
    `Q ${number(branchX)} ${number(targetY)} ${number(afterBranch)} ${number(targetY)}`,
    `H ${number(endX)}`
  ].join(' ');
}
