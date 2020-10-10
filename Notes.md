# TODO:

* Initial fork distance
* Average fork interval (or prob?)
* Primary fork deviation angle
* Secondary fork deviation angle
* Secondary fork scale
* Secondary fork count
* maxForks
* gravity bias - base
* gravity bias - tip

leader stem / central stem / trunk

* I need a way to be confident that I won't lose designs as I make more.

* Leaf Gradients.
  * Gradient length

* Replace color editing with gradient editing?

# Branch model:

  Pine vs Willow.

  Pine:
    Branches close together
    Branches in radom directions, but not too close to previous branches.
    Branches angle downward:
      - No trunk influence
      - Small gravity influence
    Only one or two levels of branching

  Willow:
    Small branch angles
    Curved segments between forks
    Gravity influence increasing near tips

So parameters we want are:

  * Frequency of brancing from trunk
  * Frequency of forks
  * Type of fork:
    - split into two equals, both diverted same angle (symmetrical)
    - main branch keeps going same direction, smaller branch diverts at angle
  * Subsequent branches are often at right angles to previous branches
