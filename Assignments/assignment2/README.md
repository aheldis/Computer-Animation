Everything is similar to the instructions. We calculate Jacobian in line 160 of human.js.
The iterative IK algorithm is implemented in line 258 of assignment2.js.
The only difference is in dof. I didn't run the code with 3 translational degrees of freedom at the root for a smoother animation. Although my struggles can be seen in human.js (see the commented codes).
I added random rotations for the times we encountered singularity errors and when our rotation made the hand get farther than our goal.