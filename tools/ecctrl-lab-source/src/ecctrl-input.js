export const GAMEPAD_DEADZONE = 0.14;
export const RUN_ANIMATION_THRESHOLD = 0.72;

export function applyRadialDeadzone(rawX, rawY, deadzone = GAMEPAD_DEADZONE) {
  const magnitude = Math.hypot(rawX, rawY);
  if (magnitude <= deadzone || magnitude === 0) return { x: 0, y: 0 };
  const clampedMagnitude = Math.min(1, magnitude);
  const scaledMagnitude = (clampedMagnitude - deadzone) / (1 - deadzone);
  return {
    x: rawX / magnitude * scaledMagnitude,
    y: rawY / magnitude * scaledMagnitude,
  };
}

export function gamepadButtonPressed(gamepad, index) {
  const button = gamepad?.buttons?.[index];
  return Boolean(button && (button.pressed || button.value > 0.5));
}

export function readEcctrlGamepad(gamepad) {
  if (!gamepad) return null;
  const stick = applyRadialDeadzone(
    gamepad.axes?.[0] ?? 0,
    -(gamepad.axes?.[1] ?? 0),
  );
  const dpadX = Number(gamepadButtonPressed(gamepad, 15)) - Number(gamepadButtonPressed(gamepad, 14));
  const dpadY = Number(gamepadButtonPressed(gamepad, 12)) - Number(gamepadButtonPressed(gamepad, 13));
  if (dpadX || dpadY) {
    const dpadMagnitude = Math.hypot(dpadX, dpadY);
    stick.x = dpadX / dpadMagnitude;
    stick.y = dpadY / dpadMagnitude;
  }
  const aimStick = applyRadialDeadzone(
    gamepad.axes?.[2] ?? 0,
    -(gamepad.axes?.[3] ?? 0),
  );
  return {
    gamepad,
    stick,
    aimStick,
    jump: gamepadButtonPressed(gamepad, 0),
    attack: gamepadButtonPressed(gamepad, 2) || gamepadButtonPressed(gamepad, 7),
    run: Math.hypot(stick.x, stick.y) >= RUN_ANIMATION_THRESHOLD,
    fullscreen: gamepadButtonPressed(gamepad, 9),
  };
}
