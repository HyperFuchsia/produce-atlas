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
         difference between a car and a loaf of bread.

         The silhouette is lifted from car3d.js (MIT), a procedural three.js
         car — not its code, which is built on a renderer this project does
         not have, but its authored profiles: thirty-odd control points a side
         where this had ten, at real GT proportions. Resampled once, at
         authoring time, through that file's own monotone cubic rather than
         our Catmull-Rom, because Catmull-Rom overshoots between control
         points and a two millimetre overshoot on a car body reads as a dent.
         Sampling it there and baking the result means the runtime is
         unchanged and the shape is the one that was drawn.

         One shell now, roof included, where it used to be a lower body with a
         separate glasshouse on top. */
      kind: 'hull',
      lengthCm: 475, widthCm: 192, heightCm: 124.3,
      /* rear bumper ....................................... front bumper */
      top: [0.316, 0.631, 0.667, 0.682, 0.697, 0.719, 0.758, 0.805, 0.850,
        0.891, 0.927, 0.956, 0.977, 0.990, 0.997, 0.999, 1.000, 0.997, 0.986,
        0.960, 0.916, 0.855, 0.784, 0.718, 0.694, 0.692, 0.691, 0.688, 0.683,
        0.662, 0.634, 0.598, 0.319],
      bottom: [0.280, 0.056, 0.039, 0.032, 0.027, 0.024, 0.022, 0.021, 0.020,
        0.019, 0.018, 0.018, 0.017, 0.017, 0.016, 0.016, 0.016, 0.016, 0.016,
        0.017, 0.017, 0.018, 0.018, 0.018, 0.019, 0.019, 0.019, 0.018, 0.015,
        0.010, 0.000, 0.002, 0.280],
      wide: [0.021, 0.837, 0.926, 0.965, 0.985, 0.996, 0.999, 0.999, 0.992,
        0.984, 0.975, 0.969, 0.966, 0.963, 0.962, 0.962, 0.962, 0.963, 0.964,
        0.965, 0.968, 0.972, 0.977, 0.983, 0.990, 0.993, 0.995, 0.992, 0.983,
        0.965, 0.939, 0.888, 0.021],
      /* Tumblehome: sill ....... shoulder ....... roof. Taken across the
         middle of the car, where the greenhouse actually is. */
      taper: [0.862, 0.908, 0.954, 1.000, 0.908, 0.816, 0.725],
      corner: 6.0,
      color: [0.17, 0.028, 0.026],

      wheels: {
        diameterCm: 70.6, widthCm: 25.5, atXCm: 143.5, atYCm: -26.9, atZCm: 83.1,
        hubCm: 40,
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
