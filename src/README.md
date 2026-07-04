# `src/` source modules

This folder is the start of the eventual Stone Wanderer game source layout.

Current extracted seams:

- `weapons.js` holds the Stone weapon order/definitions.
- `weapons.js` also holds the Red Toll greatsword visual/mesh code as a normal weapon variant source, rather than leaving that 3D weapon code inside the page wrapper.
- `weapon-core-patch.js` bridges the current all-in-one Stone Lab core by replacing its legacy inline weapon-definition block with data generated from `weapons.js` before the official lab loads the core.
- `combat-audio.js` holds the Stone combat audio director and wrapper-level sound hooks.
- `lab-modes.js` holds the Stance Cards / Individual Moves lab-mode switcher that used to live only in `stone-wanderer-individual-move-test.html`.

The current Stone Lab core still contains most of the game code. Future cleanup passes should pull out the next seams one at a time, such as attacks, input, enemies, UI, and audio. The short-term goal is one official Stone Weapon Lab entry point with donor/reference pages kept only while they remain useful.
