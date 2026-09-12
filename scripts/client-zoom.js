'use strict';

function nextZoomFactor(current, deltaY, control, force2D) {
  if (!control || !force2D || !deltaY) return current;
  const direction = deltaY > 0 ? 1 : -1;
  return Math.max(0.5, Math.min(2, Math.round((current + direction * 0.1) * 10) / 10));
}

module.exports = { nextZoomFactor };
