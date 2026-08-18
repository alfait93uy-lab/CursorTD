/**
 * CAMERA.JS
 * WASD panning and keeping the camera within the map bounds at any zoom.
 */

import { CONFIG } from "./config.js";
import { canvas, state } from "./state.js";
import { clamp } from "./utils.js";

export function updateCamera(dt) {
  const { keys, camera } = state;
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  camera.x += dx * CONFIG.CAMERA_SPEED * dt;
  camera.y += dy * CONFIG.CAMERA_SPEED * dt;

  clampCamera();
}

export function clampCamera() {
  const { camera } = state;
  const halfViewW = canvas.width / (2 * camera.zoom);
  const halfViewH = canvas.height / (2 * camera.zoom);

  if (halfViewW * 2 >= CONFIG.MAP_WIDTH) {
    camera.x = CONFIG.MAP_WIDTH / 2;
  } else {
    camera.x = clamp(camera.x, halfViewW, CONFIG.MAP_WIDTH - halfViewW);
  }

  if (halfViewH * 2 >= CONFIG.MAP_HEIGHT) {
    camera.y = CONFIG.MAP_HEIGHT / 2;
  } else {
    camera.y = clamp(camera.y, halfViewH, CONFIG.MAP_HEIGHT - halfViewH);
  }
}
