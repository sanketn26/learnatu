/**
 * A short field guide to each kind of scene: what it is for, what it cannot do, and the words it understands.
 * The playground shows it beside the editor; it is also a quick check that the docs and the checker agree.
 */
export interface KindInfo { title: string; summary: string; cannot: string; words: string[] }

export const KIND_INFO: Record<string, KindInfo> = {
  mechanics: {
    title: 'Mechanics',
    summary: 'Bodies, gravity, springs, rods, drag, floors, ramps with friction, and collisions, moving over time.',
    cannot: 'Rotation of extended bodies, fluids, friction that depends on speed, more than a flat 2D plane.',
    words: ['body', 'gravity', 'spring', 'rod', 'drag', 'ground', 'incline', 'collide', 'run', 'plot', 'show', 'trail', 'note', 'backdrop']
  },
  wave: {
    title: 'Waves: light and sound',
    summary: 'Rings from point sources, interference, the Doppler effect and shock cones, probes, and fringes from slits.',
    cannot: 'Polarisation, reflection from surfaces, 3D waves, anything that needs solving Maxwell\'s equations.',
    words: ['medium', 'source', 'slits', 'screen', 'probe', 'plot', 'run', 'note']
  },
  ray: {
    title: 'Rays and lenses',
    summary: 'An object, a thin lens or a mirror, the three principal rays and the image; or a beam crossing a boundary.',
    cannot: 'Thick lenses, aberrations, colour spreading (dispersion), wave effects.',
    words: ['object', 'lens', 'mirror', 'screen', 'beam']
  },
  field: {
    title: 'Fields',
    summary: 'The electric field of point charges, or the gravitational field of point masses: arrows, field lines, potential.',
    cannot: 'Moving charges, magnetic fields, fields inside matter, mixing electric and gravity.',
    words: ['charge', 'mass', 'probe', 'show', 'window']
  },
  cycle: {
    title: 'Heat and cycles',
    summary: 'An ideal gas taken through isothermal, isobaric, isochoric and adiabatic steps, on a pressure-volume diagram.',
    cannot: 'Real gases, phase changes, irreversible processes.',
    words: ['gas', 'process', 'note']
  },
  circuit: {
    title: 'Circuits',
    summary: 'A battery with resistors in series and parallel, and a capacitor charging through them.',
    cannot: 'Circuits with several loops, inductors, alternating current, real batteries.',
    words: ['battery', 'resistor', 'lamp', 'capacitor', 'parallel', 'end', 'run']
  },
  spacetime: {
    title: 'Relativity',
    summary: 'Events, worldlines and light cones on a Minkowski diagram, with a moving observer: simultaneity, time dilation, the interval.',
    cannot: 'Gravity, acceleration, curved spacetime, more than one space dimension.',
    words: ['event', 'worldline', 'clock', 'frame', 'show', 'measure']
  },
  bloch: {
    title: 'Quantum: one qubit',
    summary: 'A single qubit on the Bloch sphere, with gates drawn as rotations and measurement odds.',
    cannot: 'More than one qubit (entanglement has no honest picture), noise, the wave function in space.',
    words: ['state', 'step', 'gate', 'measure']
  }
};
