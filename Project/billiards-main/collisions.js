import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;


class Line extends Shape{
  constructor() {
    super("position", "normal")
    this.material = {shader: new defs.Phong_Shader(), ambient: 1.0, color: color(1, 0, 0, 1)}
    this.arrays.position.push(vec3(0, 0, 0))
    this.arrays.normal.push(vec3(0, 0, 0))
    this.arrays.position.push(vec3(1, 0, 0))
    this.arrays.normal.push(vec3(0, 0, 0))
  }
  draw(webgl_manager, uniforms){
    super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
  }
  update(webgl_manager, uniforms, x1, x2){
    this.arrays.position[0] = x1
    this.arrays.position[1] = x2
    this.copy_onto_graphics_card(webgl_manager.context)
  }
}

class Ball{
  constructor(ball_color, radius=0.2) {
    this.color = ball_color
    this.position = vec3(0, 0, 0)
    this.velocity = vec3(0, 0, 0)
    this.acceleration = vec3(0, 0, 0)
    this.radius=radius
  }
}

class PhysicsEngine{
  constructor(left=-3, right=3, top=3, bottom=-3) {
    this.left = left
    this.right = right
    this.top = top
    this.bottom = bottom
    this.friction_coef = 2.0
  }
  apply_friction(balls){
    for(let i=0; i<balls.length; i++){
      balls[i].acceleration =  balls[i].velocity.normalized().times(-this.friction_coef)
    }
  }
  update_velocity(balls, dt){
    for(let i=0; i<balls.length; i++){
      balls[i].velocity = balls[i].velocity.plus(balls[i].acceleration.times(dt))
    }
  }
  update_positions(balls, dt){
    for(let i=0; i < balls.length; i++){
      if (balls[i].visible)
        balls[i].position = balls[i].position.plus(balls[i].velocity.times(dt))
    }
  }

  collide_balls(balls){
    for(let i=0; i<balls.length-1; i++){
      for(let j=i+1; j<balls.length; j++){
        const d_position = balls[i].position.minus(balls[j].position)
        if(d_position.norm() < (balls[i].radius + balls[j].radius)){
          const d_velocity = balls[i].velocity.minus(balls[j].velocity)
          if (d_velocity.dot(d_position) > 0){
            // Meaning the collision has already been detected and hence we can skip
            continue
          }

          // Following https://en.wikipedia.org/wiki/Elastic_collision#Two-dimensional
          const d_position_unitvector = d_position.normalized()
          const v1_normal = d_position_unitvector.times(d_position_unitvector.dot(balls[i].velocity))
          const v1_tangent = balls[i].velocity.minus(v1_normal)
          const v2_normal = d_position_unitvector.times(d_position_unitvector.dot(balls[j].velocity))
          const v2_tangent = balls[j].velocity.minus(v2_normal)

          const new_v1 = v1_tangent.plus(v2_normal)
          const new_v2 = v2_tangent.plus(v1_normal)

          balls[i].velocity = new_v1
          balls[j].velocity = new_v2
        }
      }
    }
  }

  collide_walls(balls){
    for(let i=0; i<balls.length; i++){
      if (!balls[i].visible)
        continue;
      if(balls[i].position[0]-balls[i].radius<this.left){
        balls[i].velocity[0] = Math.abs(balls[i].velocity[0])
      }
      else if(balls[i].position[0]+balls[i].radius>this.right){
        balls[i].velocity[0] = -Math.abs(balls[i].velocity[0])
      }
      if(balls[i].position[2]-balls[i].radius<this.bottom){
        balls[i].velocity[2] = Math.abs(balls[i].velocity[2])
      }
      else if(balls[i].position[2]+balls[i].radius>this.top){
        balls[i].velocity[2] = -Math.abs(balls[i].velocity[2])
      }
    }
  }
}

export
const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Collisions,
                                               // exposes only the display() method, which actually places and draws the shapes,
                                               // isolating that code so it can be experimented with on its own.
      init()
      {
        console.log("init")

        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(),
          'line': new Line()};

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.board = { shader: phong, ambient: 1.0, diffusivity: 1, specularity: .3, color: color( 0, .6, .1, 1 ) }
        this.materials.metal = { shader: phong, ambient: .8, diffusivity: 1, specularity:  1, color: color( .9,.5, .9, 1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;
        this.init_balls(9)
        this.physics = new PhysicsEngine()

      }
      init_balls(N){
        this.balls = []
        const init_v = 6
        const init_p = 3


        for (let i=0; i<N; i++){
          this.balls.push(new Ball(color(Math.random(), Math.random(), Math.random(), 1.0)))
          this.balls[i].position = vec3(Math.random() * init_p, -1, Math.random() * init_p)
          this.balls[i].velocity = vec3(Math.random() * init_v, 0, Math.random() * init_v )
        }
      }

      draw_ball(ball, caller){
        let m = Mat4.scale(ball.radius, ball.radius, ball.radius)
        m = Mat4.translation(ball.position[0], ball.radius + 0.01, ball.position[2]).times(m) // radius + height of the board
        this.shapes.ball.draw(caller, this.uniforms, m, { ...this.materials.metal, color: ball.color })
        //this.shapes.ball.draw(caller, this.uniforms, m, this.materials.metal)
      }

      draw_balls(caller){
        for(let i=0; i<this.balls.length; i++){
          this.draw_ball(this.balls[i], caller)
        }
      }

      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Collisions, a
        // subclass of this Scene.  Here, the base class's display only does
        // some initial setup.

        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if( !caller.controls )
        { this.animated_children.push( caller.controls = new defs.Movement_Controls( { uniforms: this.uniforms } ) );
          caller.controls.add_mouse_controls( caller.canvas );

          // Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
          // matrix follows the usual format for transforms, but with opposite values (cameras exist as
          // inverted matrices).  The projection matrix follows an unusual format and determines how depth is
          // treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
          // orthographic() automatically generate valid matrices for one.  The input arguments of
          // perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

          // !!! Camera changed here
          Shader.assign_camera( Mat4.look_at (vec3 (6, 7, 7), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
          //Shader.assign_camera( Mat4.look_at (vec3 (0, 0, 3), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;

        const light_position = vec4(20, 20, 20, 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000 ) ];
      }
    }
export class Collisions extends Part_one_hermite_base
{                                                    // **Collisions** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to


    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
        // From here on down it's just some example shapes drawn for you -- freely
        // replace them with your own!  Notice the usage of the Mat4 functions
        // translation(), scale(), and rotation() to generate matrices, and the
        // function times(), which generates products of matrices.

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(3, 0.01, 3));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, this.materials.board );

    let dt = this.uniforms.animation_delta_time / 1000
    dt = Math.min(1/60, dt)
    let t_step = 1/1000

    let t_sim = this.uniforms.animation_time/1000
    let t_next = t_sim + dt // t_sim is the simulation time

    for ( ; t_sim <= t_next; t_sim += t_step ) {
      this.physics.collide_walls(this.balls)
      this.physics.apply_friction(this.balls)
      this.physics.update_velocity(this.balls, t_step)
      this.physics.update_positions(this.balls, t_step)
    }
    this.draw_balls(caller)
    this.physics.collide_balls(this.balls)

    this.shapes.line.update(caller, this.uniforms, vec3(-3, 0.5, -3), vec3(-3, 0.5, 3))
    this.shapes.line.draw(caller, this.uniforms)
    this.shapes.line.update(caller, this.uniforms, vec3(-3, 0.5, 3), vec3(3, 0.5, 3))
    this.shapes.line.draw(caller, this.uniforms)
    this.shapes.line.update(caller, this.uniforms, vec3(3, 0.5, 3), vec3(3, 0.5, -3))
    this.shapes.line.draw(caller, this.uniforms)
    this.shapes.line.update(caller, this.uniforms, vec3(3, 0.5, -3), vec3(-3, 0.5, -3))
    this.shapes.line.draw(caller, this.uniforms)
  }

  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including

  }
}
