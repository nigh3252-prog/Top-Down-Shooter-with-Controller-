const finite = value => Number.isFinite(Number(value));

export function createDelayedPositionTracker({ delaySeconds = 3, retentionSeconds = 4.25 } = {}) {
  const delay = Math.max(0, Number(delaySeconds) || 0);
  const retention = Math.max(delay + .5, Number(retentionSeconds) || delay + 1);
  const samples = [];

  function clear() {
    samples.length = 0;
  }

  function record(time, position) {
    const at = Number(time);
    const x = Number(position?.x);
    const z = Number(position?.z);
    if (!finite(at) || !finite(x) || !finite(z)) return false;

    const next = { time:at, x, z };
    const last = samples[samples.length - 1];
    if (last && at < last.time) clear();
    const currentLast = samples[samples.length - 1];
    if (currentLast && at === currentLast.time) samples[samples.length - 1] = next;
    else samples.push(next);

    const cutoff = at - retention;
    while (samples.length > 2 && samples[1].time < cutoff) samples.shift();
    return true;
  }

  function sample(time) {
    if (!samples.length) return null;
    const targetTime = Number(time) - delay;
    if (!finite(targetTime) || targetTime <= samples[0].time) {
      const first = samples[0];
      return { x:first.x, z:first.z, time:first.time };
    }

    const last = samples[samples.length - 1];
    if (targetTime >= last.time) return { x:last.x, z:last.z, time:last.time };

    let low = 0;
    let high = samples.length - 1;
    while (high - low > 1) {
      const mid = (low + high) >> 1;
      if (samples[mid].time <= targetTime) low = mid;
      else high = mid;
    }

    const a = samples[low];
    const b = samples[high];
    const span = Math.max(1e-6, b.time - a.time);
    const mix = Math.max(0, Math.min(1, (targetTime - a.time) / span));
    return {
      x:a.x + (b.x - a.x) * mix,
      z:a.z + (b.z - a.z) * mix,
      time:targetTime,
    };
  }

  return {
    clear,
    record,
    sample,
    get delaySeconds() { return delay; },
    get sampleCount() { return samples.length; },
  };
}
