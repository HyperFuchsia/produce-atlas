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
      /* rear bumper ....................................... front bumper */
      top: [0.44, 0.58, 0.63, 0.76, 0.88, 0.88, 0.74, 0.56, 0.50, 0.42],
      bottom: [0.32, 0.19, 0.15, 0.14, 0.14, 0.14, 0.14, 0.15, 0.20, 0.32],
      wide: [0.58, 0.86, 0.96, 1.00, 1.00, 1.00, 0.98, 0.90, 0.76, 0.54],
      corner: 5.0,
      color: [0.17, 0.028, 0.026],
      wheels: {
        diameterCm: 64, widthCm: 22, atXCm: 144, atYCm: -40.5, atZCm: 78,
        color: [0.08, 0.08, 0.09]
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
