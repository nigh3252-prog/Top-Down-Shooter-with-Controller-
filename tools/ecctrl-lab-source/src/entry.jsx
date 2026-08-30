import { createRoot } from 'react-dom/client';
import { EcctrlLab } from './ecctrl-lab.jsx';
import './ecctrl-lab.css';

let root = null;
let rootElement = null;
let active = false;
let callbacks = {};

function render() {
  if (!root) return;
  root.render(
    <EcctrlLab
      active={active}
      onCharacterReady={callbacks.onCharacterReady}
      onInputChange={callbacks.onInputChange}
    />,
  );
}

export function mountEcctrlLab(element, options = {}) {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('mountEcctrlLab requires an HTMLElement.');
  }
  if (rootElement && rootElement !== element) {
    throw new Error('The Ecctrl Lab sandbox is already mounted elsewhere.');
  }
  callbacks = { ...callbacks, ...options };
  if (!root) {
    rootElement = element;
    root = createRoot(element);
  }
  render();
  return true;
}

export function setEcctrlLabActive(nextActive) {
  active = Boolean(nextActive);
  render();
  return active;
}
