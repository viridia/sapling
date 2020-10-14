# TODO:

## Next

* Change length calculation - branchAt only
  * Will need to estimate length
  * monopods will need a different calc for intervals.
* Uniform leaf sizes for non-monos

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

# Bugs

* Saturation slider
* log scale doesn't work

# Minor features

* Serialize enums?
* Hide irrelevant properties.
