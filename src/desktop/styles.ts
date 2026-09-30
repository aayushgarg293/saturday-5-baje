/**
 * The desktop's look, as one stylesheet (it's HTML, so CSS): the monitor's
 * bezel round the screen, the CRT's scanlines and dark curved edges, and the
 * Windoze XP look: blue title bars with rounded tops, the red close button,
 * the green start button, the blue taskbar, the Start menu.
 *
 * The screen is 800 × 600 pixels, as those CRTs ran, scaled up to fit.
 */

/** The desktop's size in its own pixels. */
export const SCREEN = { w: 800, h: 600 };

const FONT = 'Tahoma, Verdana, "Segoe UI", sans-serif';

export const CSS = /* css */ `
.xp-overlay { position: fixed; inset: 0; z-index: 20; display: flex;
  /* round the monitor: the dim booth, darker toward the edges (so the eye stays on the screen) */
  background: radial-gradient(ellipse at center, #4a3c30 30%, #1c1510 100%);
  align-items: center; justify-content: center; opacity: 0; transition: opacity 0.35s; }
.xp-overlay.open { opacity: 1; }
/* hidden means gone: without this, the display above would win over [hidden], and the
   invisible desktop would still lie over the game, catching every click */
.xp-overlay[hidden] { display: none; }
/* the monitor's plastic round the glass */
.xp-bezel { position: relative; padding: 1.2vh; border-radius: 1.2vh; background: linear-gradient(#ddd4bc, #c2b99f);
  box-shadow: inset 0 0 0 2px #b4ab92, 0 0 60px rgba(0,0,0,0.35); }
.xp-glass { position: relative; overflow: hidden; border-radius: 1.2vh; background: #000; }
.xp-screen { position: absolute; left: 0; top: 0; width: ${SCREEN.w}px; height: ${SCREEN.h}px; transform-origin: 0 0;
  font: 11px ${FONT}; color: #000; user-select: none; background-size: cover;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='22'%3E%3Cpath d='M1 1 L1 17 L5 13 L8 20 L11 19 L8 12 L13 12 Z' fill='white' stroke='black' stroke-width='1'/%3E%3C/svg%3E") 1 1, default; }
/* the CRT: faint scanlines and dark, curved edges, over everything, not catching clicks */
.xp-crt { position: absolute; inset: 0; pointer-events: none; z-index: 1000;
  background: repeating-linear-gradient(rgba(0,0,0,0.06) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.35) 100%); }

/* desktop icons */
.xp-icon { position: absolute; width: 76px; text-align: center; color: #fff; text-shadow: 1px 1px 1px #000; padding: 2px; }
.xp-icon .pic { width: 34px; height: 34px; margin: 0 auto 3px; border-radius: 4px; }
.xp-icon.selected span { background: #316ac5; }

/* the taskbar */
.xp-taskbar { position: absolute; left: 0; right: 0; bottom: 0; height: 30px; display: flex; align-items: center;
  background: linear-gradient(#3168d5, #245edb 10%, #1941a5); z-index: 900; }
.xp-start { height: 30px; padding: 0 16px 0 10px; display: flex; align-items: center; gap: 5px; color: #fff;
  font: italic bold 17px ${FONT}; text-shadow: 1px 1px 2px #1a3d12; border-radius: 0 10px 10px 0;
  background: linear-gradient(#5eac56, #3c9a3c 50%, #2f7f2f); }
.xp-start:hover { filter: brightness(1.1); }
.xp-tasks { flex: 1; display: flex; gap: 3px; padding: 0 6px; overflow: hidden; }
.xp-task { width: 150px; height: 23px; padding: 0 8px; display: flex; align-items: center; color: #fff; border-radius: 3px;
  background: #3c81f3; box-shadow: inset 0 0 0 1px #1c4fb7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-task.flash { animation: xp-flash 1s steps(1) infinite; }
@keyframes xp-flash { 50% { background: #f0a030; box-shadow: inset 0 0 0 1px #b86e10; } }
.xp-task.focused { background: #1e52b7; box-shadow: inset 1px 1px 2px #0e2b6f; }
.xp-tray { height: 30px; padding: 0 10px; display: flex; align-items: center; gap: 8px; color: #fff;
  background: linear-gradient(#0f8ae8, #0c6fd6); border-left: 1px solid #0a4ea4; }
.xp-tray .smiley { width: 14px; height: 14px; border-radius: 50%; background: #f2d024; box-shadow: inset 0 0 0 1px #9a7a00; }

/* a balloon above the tray */
.xp-toast { position: absolute; right: 8px; bottom: 38px; z-index: 960; padding: 8px 12px; border-radius: 6px;
  background: #ffffe1; border: 1px solid #888; box-shadow: 2px 2px 5px rgba(0,0,0,0.3); font-weight: bold; }

/* the Start menu */
.xp-menu { position: absolute; left: 0; bottom: 30px; width: 380px; z-index: 950; border-radius: 6px 6px 0 0; overflow: hidden;
  box-shadow: 2px 2px 8px rgba(0,0,0,0.5); background: #fff; display: none; }
.xp-menu.open { display: block; }
.xp-menu .head { height: 54px; display: flex; align-items: center; gap: 10px; padding: 0 10px; color: #fff;
  font: bold 14px ${FONT}; background: linear-gradient(#1868ce, #0e60cb); }
.xp-menu .head .pic { width: 40px; height: 40px; border-radius: 4px; border: 2px solid #fff; background: #d9a441; }
.xp-menu .cols { display: flex; }
.xp-menu .left { flex: 1; padding: 6px 0; }
.xp-menu .right { width: 170px; padding: 6px 0; background: #d3e5fa; border-left: 1px solid #95bdee; }
.xp-menu .item { display: flex; align-items: center; gap: 8px; padding: 5px 10px; }
.xp-menu .item:hover { background: #316ac5; color: #fff; }
.xp-menu .item .pic { width: 22px; height: 22px; border-radius: 3px; flex: none; }
.xp-menu .foot { height: 38px; display: flex; justify-content: flex-end; align-items: center; gap: 12px; padding: 0 12px;
  color: #fff; background: linear-gradient(#1868ce, #0e60cb); }
.xp-menu .foot .btn { display: flex; align-items: center; gap: 5px; }
.xp-menu .foot .btn .pic { width: 22px; height: 22px; border-radius: 4px; }

/* windows */
.xp-window { position: absolute; display: flex; flex-direction: column; border-radius: 8px 8px 0 0; overflow: hidden;
  background: #ece9d8; box-shadow: 0 0 0 1px #0831d9, 2px 3px 8px rgba(0,0,0,0.4); }
.xp-window.minimised { display: none; }
.xp-title { height: 26px; flex: none; display: flex; align-items: center; gap: 5px; padding: 0 4px 0 6px; color: #fff;
  font: bold 13px ${FONT}; text-shadow: 1px 1px #0a1e6d; background: linear-gradient(#0997ff, #0053ee 8%, #0050ee 40%, #06f 88%, #0843a8); }
.xp-window.inactive .xp-title { background: linear-gradient(#7697e7, #7e9ee3 50%, #94afe8); }
.xp-title .name { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-title .pic { width: 16px; height: 16px; border-radius: 3px; }
.xp-title .b { width: 21px; height: 21px; border-radius: 3px; border: 1px solid #fff; display: flex; align-items: center;
  justify-content: center; font: bold 12px ${FONT}; background: linear-gradient(#3c8cfe, #1a5ef0); }
.xp-title .b.close { background: linear-gradient(#e78e70, #d9542a 50%, #c13d18); }
.xp-body { flex: 1; overflow: auto; background: #fff; border: 3px solid #0050ee; border-top: 0; }
.xp-window.inactive .xp-body { border-color: #7e9ee3; }

/* a dialog's grey body; a sunken text field; the green-block progress bar */
.xp-dialog { height: 100%; box-sizing: border-box; padding: 12px 14px; background: #ece9d8; line-height: 1.5; }
.xp-dialog .buttons { margin-top: 12px; text-align: right; }
.xp-dialog .facts, .xp-dialog .facts2 { display: flex; gap: 10px; margin: 6px 0; }
.xp-dialog .facts2 { display: block; color: #333; }
.xp-dialog .facts .pic { width: 32px; height: 32px; flex: none; border-radius: 3px; }
.xp-dialog .what { font-weight: bold; }
.xp-dialog .from { color: #555; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-field { display: inline-block; min-height: 15px; padding: 2px 5px; background: #fff; border: 1px solid #7f9db9; vertical-align: middle; }
.xp-progress { height: 14px; padding: 1px; background: #fff; border: 1px solid #7f9db9; border-radius: 2px; }
.xp-progress > div { height: 100%; width: 0; background: repeating-linear-gradient(90deg, #37c037 0 7px, transparent 7px 9px); }
/* the Open box: folders down the left, files, the name, the buttons */
.xp-openbox { display: flex; gap: 8px; padding: 8px; }
.xp-openbox .places { width: 96px; padding: 4px 0; background: #7a96df; border-radius: 3px; }
.xp-openbox .place { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 6px 2px; color: #fff; text-align: center; }
.xp-openbox .place .pic { width: 26px; height: 22px; border-radius: 2px; }
.xp-openbox .place.here { background: rgba(255,255,255,0.25); }
.xp-openbox .main { flex: 1; display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.xp-openbox .files { flex: 1; overflow: auto; background: #fff; border: 1px solid #7f9db9; }
.xp-openbox .file { display: flex; align-items: center; gap: 6px; padding: 2px 5px; }
.xp-openbox .file .pic { width: 16px; height: 16px; flex: none; border-radius: 2px; }
.xp-openbox .file span { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.xp-openbox .file i { color: #888; font-style: normal; }
.xp-openbox .file.chosen { color: #fff; background: #316ac5; }
.xp-openbox .name .xp-field { width: 70%; }
.xp-openbox .buttons { margin: 0; }

/* a plain XP dialog button */
.xp-button { display: inline-block; min-width: 70px; padding: 3px 10px; text-align: center; border: 1px solid #003c74;
  border-radius: 3px; background: linear-gradient(#fff, #ece9d8 85%, #d6d0c5); }
.xp-button:hover { box-shadow: inset 0 0 0 2px #f8b636; }
`;
