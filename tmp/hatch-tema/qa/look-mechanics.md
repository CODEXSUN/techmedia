# TEMA look mechanics

TEMA is a rigid humanoid toy robot with a separate rounded screen head, short neck, planted feet, a flexible antenna, and cyan features drawn on a fixed black face display. The lower torso and feet stay anchored. Screen eyes lead each gaze, the head yaws or pitches next, the neck and upper torso follow slightly, and the antenna bends with restrained follow-through. Hands remain empty and stable.

Motion budget: every 22.5-degree step changes the screen-eye position, head angle, and antenna bend by an even small increment. Body scale, baseline, vest, chest light, and shoe registration remain constant. No whole-sprite rotation or raster warp.

- 000 up: eyes and face features move upward, head pitches up, antenna leans back; torso stays frontal.
- 090 screen-right: eyes move right, head turns right so more of TEMA's left side is visible; right side of face recedes.
- 180 down: eyes and face features move down, head bows, upper torso leans forward slightly.
- 270 screen-left: eyes move left, head turns left so more of TEMA's right side is visible; left side of face recedes.

Diagonals interpolate these families continuously. The cyan smile may compress slightly with pitch but remains the same screen-face identity. The chest light, vest, hands, feet, and body volume do not jump or change sides.
