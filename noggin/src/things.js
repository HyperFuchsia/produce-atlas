/* Produce Atlas — things that are not plants.

   The atlas proper is food plants: checked, sourced, and the reason its
   answers can be trusted. This is the other half of the promise. "I can be
   anything" does not survive first contact with someone typing "car", and the
   first thing anyone types once they realise it changes shape is something
   that was never in a botany textbook.

   Registered separately so the two never get mistaken for one another, and so
   adding a thing is adding a table entry. */
(function (NG) {
  'use strict';

  const K = NG.K;

  K.register([
    {
      id: 'car', name: 'car',
      match: ['car', 'automobile', 'motor car', 'hatchback', 'saloon', 'sedan', 'vehicle'],
      made: true,

      /* A lofted hull rather than a solid of revolution. The roofline and the
         floorpan are separate curves, front to back, which is the whole
         difference between a car and a loaf of bread. */
      kind: 'hull',
      lengthCm: 450, widthCm: 180, heightCm: 145,
      /* The lower body only: sills, shoulder, and a beltline at about 90 cm.
         Everything above that is the glasshouse, which is a separate shell.
         rear bumper ....................................... front bumper */
      top: [0.46, 0.58, 0.62, 0.64, 0.65, 0.65, 0.63, 0.58, 0.52, 0.44],
      bottom: [0.22, 0.14, 0.11, 0.10, 0.10, 0.10, 0.10, 0.11, 0.14, 0.22],
      wide: [0.66, 0.90, 0.98, 1.00, 1.00, 1.00, 0.99, 0.94, 0.84, 0.62],
      /* sill ......... shoulder ......... belt: widest in the middle */
      taper: [0.84, 0.96, 1.00, 0.99, 0.93],
      corner: 6.0,
      color: [0.17, 0.028, 0.026],

      cabin: {
        kind: 'hull',
        lengthCm: 252, widthCm: 142, heightCm: 56,
        atXCm: -16, atYCm: 40,
        /* backlight ......... roof ......... windscreen */
        top: [0.22, 0.68, 0.92, 1.00, 1.00, 0.97, 0.84, 0.50, 0.16, 0.04],
        bottom: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        wide: [0.42, 0.80, 0.95, 1.00, 1.00, 1.00, 0.97, 0.86, 0.60, 0.32],
        taper: [1.00, 0.97, 0.91, 0.82, 0.70],
        corner: 4.5,
        color: [0.030, 0.038, 0.052]
      },

      wheels: {
        diameterCm: 64, widthCm: 22, atXCm: 143, atYCm: -40.5, atZCm: 76,
        hubCm: 38,
        color: [0.022, 0.022, 0.025], hubColor: [0.38, 0.40, 0.43]
      },

      family: 'road vehicles, which is not a clade and I want that on the record',
      binomial: 'there is not one, and it bothers me more than it should',
      type: 'machine',
      origin: 'Mannheim, 1886',
      ancestor: null,
      facts: [
        'a modern car is around thirty thousand parts, and roughly a third of them move',
        'the average car spends about ninety-five per cent of its life parked. You built all this to leave it standing still',
        'crumple zones work by being deliberately weak. The car is designed to destroy itself so that you stop over half a metre instead of over two centimetres',
        'the bottom of a rolling wheel is not moving. Every point on the rim traces a cycloid, and the patch touching the road is momentarily at rest — which is why it grips instead of sliding',
        'Karl Benz built the first one with three wheels and about two thirds of one horsepower. His wife Bertha took it on a 106 km trip without telling him, to prove it worked, and had to clean a blocked fuel line with a hatpin'
      ],
      taste: 'like a serious mistake. I would not.'
    }
  ]);
})(window.NG = window.NG || {});
