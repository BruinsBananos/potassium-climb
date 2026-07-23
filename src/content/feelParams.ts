/**
 * Feel Document defaults (Prompt 2) — hot-tunable.
 * Edit this file and hot-reload, or mutate window.__FEEL at runtime.
 */
export type FeelParams = {
  world: {
    design_w: number;
    design_h: number;
    px_per_meter_ui: number;
    physics_hz: number;
    max_physics_steps_per_frame: number;
  };
  body: {
    hurt_w: number;
    hurt_h: number;
    feet_w: number;
    feet_h: number;
    wall_w: number;
    wall_h: number;
    min_land_overlap: number;
    corner_correct_x: number;
    corner_correct_y: number;
    land_y_slop: number;
  };
  horizontal: {
    accel_ground: number;
    accel_ice: number;
    accel_peel: number;
    accel_air: number;
    friction_ground: number;
    friction_ice: number;
    friction_peel: number;
    air_drag: number;
    max_run_speed: number;
    air_control: number;
    peel_impulse: number;
    move_inherit: number;
    move_inherit_on_leave: number;
  };
  jump: {
    jump_speed_base: number;
    jump_speed_from_run: number;
    jump_carry_exp: number;
    jump_hold_max: number;
    jump_hold_accel: number;
    jump_cut_multiplier: number;
    coyote_ms: number;
    jump_buffer_ms: number;
    gravity: number;
    max_fall_speed: number;
  };
  super_jump: {
    super_jump_mul: number;
    super_jump_max_stacks: number;
  };
  landing: {
    impact_perfect: number;
    impact_great: number;
    impact_ok: number;
    edge_perfect: number;
    edge_great: number;
    edge_ok: number;
    land_vx_mul_perfect: number;
    land_vx_mul_great: number;
    land_vx_mul_ok: number;
    land_vx_mul_scuff: number;
    style_perfect: number;
    style_great: number;
    style_ok: number;
    style_scuff: number;
    ban_crumb_perfect: number;
    combo_window_ms: number;
    combo_perfect: number;
    combo_great: number;
    combo_ok: number;
    combo_scuff: number;
  };
  spring: {
    spring_vy: number;
    spring_vx_keep: number;
    spring_allow_hold: boolean;
  };
  wall: {
    wall_cling_ms: number;
    wall_slide_gravity: number;
    wall_slide_max: number;
    wall_jump_vx: number;
    wall_jump_vy: number;
    wall_grace_ms: number;
    wall_regrab_lock_ms: number;
    wall_enter_speed: number;
    wall_combo_refresh_ms: number;
    wall_style: number;
  };
  camera: {
    deadzone_w: number;
    deadzone_h: number;
    look_ahead_x: number;
    look_ahead_y_up: number;
    look_ahead_y_down: number;
    player_screen_y: number;
    cam_lerp_x: number;
    cam_lerp_y_rise: number;
    cam_lerp_y_fall: number;
    cam_fall_vy_trigger: number;
    cam_max_speed: number;
    /** >1 zooms world in (sprites/platforms larger on screen) */
    view_zoom: number;
  };
};

export const FEEL_DEFAULTS: FeelParams = {
  world: {
    design_w: 720,
    design_h: 1280,
    px_per_meter_ui: 48,
    physics_hz: 120,
    max_physics_steps_per_frame: 4,
  },
  body: {
    hurt_w: 28,
    hurt_h: 48,
    feet_w: 20,
    feet_h: 6,
    wall_w: 24,
    wall_h: 36,
    min_land_overlap: 0.35,
    corner_correct_x: 6,
    corner_correct_y: 4,
    land_y_slop: 3,
  },
  horizontal: {
    accel_ground: 3200,
    accel_ice: 2600,
    accel_peel: 2400,
    accel_air: 1440,
    friction_ground: 4800,
    friction_ice: 280,
    friction_peel: 180,
    air_drag: 40,
    max_run_speed: 360,
    air_control: 0.45,
    peel_impulse: 220,
    move_inherit: 1.0,
    move_inherit_on_leave: 1.0,
  },
  jump: {
    // Floatier arc: lower gravity + longer hold; slightly softer base so height stays fair
    jump_speed_base: 640,
    jump_speed_from_run: 0.28,
    jump_carry_exp: 2.0,
    jump_hold_max: 0.24,
    jump_hold_accel: 920,
    jump_cut_multiplier: 0.58,
    coyote_ms: 120,
    jump_buffer_ms: 200,
    gravity: 1680,
    max_fall_speed: 980,
  },
  super_jump: {
    super_jump_mul: 1.55,
    super_jump_max_stacks: 2,
  },
  landing: {
    impact_perfect: 280,
    impact_great: 520,
    impact_ok: 780,
    edge_perfect: 0.35,
    edge_great: 0.55,
    edge_ok: 0.78,
    land_vx_mul_perfect: 0.98,
    land_vx_mul_great: 0.9,
    land_vx_mul_ok: 0.78,
    land_vx_mul_scuff: 0.55,
    style_perfect: 100,
    style_great: 50,
    style_ok: 15,
    style_scuff: 0,
    ban_crumb_perfect: 1,
    combo_window_ms: 1800,
    combo_perfect: 2,
    combo_great: 1,
    combo_ok: 0,
    combo_scuff: -1,
  },
  spring: {
    spring_vy: 920,
    spring_vx_keep: 0.95,
    spring_allow_hold: true,
  },
  wall: {
    wall_cling_ms: 180,
    wall_slide_gravity: 900,
    wall_slide_max: 220,
    wall_jump_vx: 340,
    wall_jump_vy: 600,
    wall_grace_ms: 55,
    wall_regrab_lock_ms: 220,
    wall_enter_speed: 60,
    wall_combo_refresh_ms: 900,
    wall_style: 10,
  },
  camera: {
    deadzone_w: 40,
    deadzone_h: 70,
    look_ahead_x: 36,
    look_ahead_y_up: 64,
    look_ahead_y_down: 24,
    /** Player screen Y fraction from top (higher = lower on screen = more sky above) */
    player_screen_y: 0.78,
    cam_lerp_x: 8.0,
    cam_lerp_y_rise: 10.0,
    cam_lerp_y_fall: 7.0,
    cam_fall_vy_trigger: -600,
    cam_max_speed: 2200,
    /** Slight zoom so MonKey + pads read larger */
    view_zoom: 1.18,
  },
};

/** Mutable runtime params (clone of defaults). */
export function createFeelParams(): FeelParams {
  return JSON.parse(JSON.stringify(FEEL_DEFAULTS)) as FeelParams;
}
