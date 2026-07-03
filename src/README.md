# `src/` source modules

This folder is the start of the eventual Stone Wanderer game source layout.

For this pass, only the weapon seam has been extracted:

- `weapons.js` holds the Stone weapon order/definitions.
- `weapons.js` also holds the Red Toll greatsword visual/mesh code as a normal weapon variant source, rather than leaving that 3D weapon code inside the page wrapper.

The current Stone Lab core still contains most of the game code. Future cleanup passes should pull out the next seams one at a time, such as attacks, input, enemies, UI, and audio.
