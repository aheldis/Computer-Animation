import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;


class Particle{
  constructor() {
    this.pos = vec3(0, 0, 0)
    this.vel = vec3(0, 0, 0)
    this.mass = 1
    this.acceleration = vec3(0, 0, 0)
  }

}
class Spring{
  constructor() {
    this.pi1 = null
    this.pi2 = null
    this.ks = null
    this.kd = null
    this.l = null
  }
}
class SpringParticleSystem{
  constructor() {
    this.particles = []
    this.springs = []
    this.gravity = vec3(0, 0, 0)
    this.ks_floor = null
    this.kd_floor = null

    this.integration_method = "euler"
    this.integration_timestep = 0.001
  }
  create_particles(Np){
    this.Np = Np
    for(let i=0; i<Np; i++){
      this.particles.push(new Particle())
    }
  }
  set_particle(i, mass, x, y, z, vx, vy, vz){
    this.particles[i].pos = vec3(x, y, z)
    this.particles[i].vel = vec3(vx, vy, vz)
    this.particles[i].acceleration = vec3(0, 0, 0)
    this.particles[i].mass = mass
    this.particles[i].initialized = true
  }


  all_velocities(vx, vy, vz){
    //TODO  add command that deos thi
    for(let i=0; i<this.Np; i++){
      this.particles[i].vel = vec3(vx, vy, vz)
    }
  }

  create_springs(Ns){
    this.Ns = Ns
    for(let i=0; i<Ns; i++){
      this.springs.push(new Spring())
    }
  }

  zero_acceleration(){
    for (let i=0; i<this.Np;i++){
      this.particles[i].acceleration = vec3(0, 0, 0)
    }
  }

  add_spring_accelerations(){
    for(let i=0; i<this.Ns; i++){
      let s = this.springs[i]
      let p1 = this.particles[s.pi1]
      let p2 = this.particles[s.pi2]
      let dvec = p2.pos.minus(p1.pos)
      let dvecnormalized = dvec.normalized()
      /*let dvecnormalized;
      if (dvec.norm() < 0.001){
        dvecnormalized = vec3(0, 0, 0)
      } else {
        dvecnormalized = dvec.normalized()
      }*/

      let vdiff = p2.vel.minus(p1.vel)

      let Fs = dvecnormalized.times(s.ks * (dvec.norm()-s.l))
      let Fd = dvecnormalized.times(s.kd * (vdiff.dot(dvecnormalized)))
      let F = Fs.plus(Fd)

      this.particles[s.pi1].acceleration = this.particles[s.pi1].acceleration.plus(F.times(1/ p1.mass))
      this.particles[s.pi2].acceleration = this.particles[s.pi2].acceleration.minus(F.times(1/ p2.mass))

    }
  }

  set_floor(ks_floor, kd_floor){
    this.ks_floor = ks_floor
    this.kd_floor = kd_floor
  }

  add_floor_penalty_acceleration(){
    for (let i=0; i<this.Np;i++){
      let p = this.particles[i]
      let y = p.pos[1] - .1
      if(y < 0){
        let Fs = vec3(0, 1, 0).times(-y * this.ks_floor)
        let Fd = vec3(0, 1 , 0).times(-p.vel[1] * this.kd_floor)

        let F = Fs.plus(Fd)
        this.particles[i].acceleration = this.particles[i].acceleration.plus(F.times(1/this.particles[i].mass))

      }
    }
  }

  add_gravity_acceleration(){
    for (let i=0; i<this.Np;i++){
      this.particles[i].acceleration = this.particles[i].acceleration.plus(this.gravity)
    }
  }

   update_accelerations(){
     this.zero_acceleration()
     this.add_gravity_acceleration()
     this.add_floor_penalty_acceleration()
     this.add_spring_accelerations()
   }


  update_velocities(t_step){
    for (let i=0; i<this.Np;i++){
      this.particles[i].vel = this.particles[i].vel.plus(this.particles[i].acceleration.times(t_step))
    }
  }

  update_positions(t_step){
    for (let i=0; i<this.Np;i++){
      this.particles[i].pos = this.particles[i].pos.plus(this.particles[i].vel.times(t_step))
    }
  }

  update_positions_verlet(t_step, old_particles){
    for (let i=0; i<this.Np;i++){
      let term1 = this.particles[i].vel.times(t_step)
      let term2 = old_particles[i].acceleration.times(t_step**2 / 2)
      this.particles[i].pos = this.particles[i].pos.plus(term1).plus(term2)
    }
  }

  update_velocities_verlet(t_step, old_particles){
    for (let i=0; i<this.Np;i++){
      this.particles[i].vel = this.particles[i].vel.plus(this.particles[i].acceleration.times(t_step/2))
      this.particles[i].vel = this.particles[i].vel.plus(old_particles[i].acceleration.times(t_step/2))
    }
  }

  update(t_step){
    if(this.integration_method == "verlet"){
      const old_particles = this.particles
      this.update_accelerations()
      this.update_positions_verlet(this.integration_timestep, old_particles)
      this.update_velocities_verlet(this.integration_timestep, old_particles) // accelerations are updated in here
    }
    else {

      this.update_accelerations()
      if (this.integration_method == 'symplectic') {
        this.update_velocities(this.integration_timestep)
        this.update_positions(this.integration_timestep)
      } else if (this.integration_method == "euler") {
        this.update_positions(this.integration_timestep)
        this.update_velocities(this.integration_timestep)
      }
    }

  }

  link(si, pi1, pi2, ks, kd, l){
    this.springs[si].pi1 = pi1
    this.springs[si].pi2 = pi2
    this.springs[si].ks = ks
    this.springs[si].kd = kd
    this.springs[si].l = l
  }
}

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

export
const Part_two_spring_base = defs.Part_two_spring_base =
    class Part_two_spring_base extends Component
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
        this.hover = this.swarm = false;
        // At the beginning of our program, load one of each of these shape
        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
        // would be redundant to tell it again.  You should just re-use the
        // one called "box" more than once in display() to draw multiple cubes.
        // Don't define more than one blueprint for the same thing here.
        this.shapes = { 'box'  : new defs.Cube(),
          'ball' : new defs.Subdivision_Sphere( 4 ),
          'axis' : new defs.Axis_Arrows(),
          'line' : new Line()
        };

        // *** Materials: ***  A "material" used on individual shapes specifies all fields
        // that a Shader queries to light/color it properly.  Here we use a Phong shader.
        // We can now tweak the scalar coefficients from the Phong lighting formulas.
        // Expected values can be found listed in Phong_Shader::update_GPU().
        const phong = new defs.Phong_Shader();
        const tex_phong = new defs.Textured_Phong();
        this.materials = {};
        this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( .9,.5,.9,1 ) }
        this.materials.metal   = { shader: phong, ambient: .2, diffusivity: 1, specularity:  1, color: color( .9,.5,.9,1 ) }
        this.materials.rgb = { shader: tex_phong, ambient: .5, texture: new Texture( "assets/rgb.jpg" ) }

        this.ball_location = vec3(1, 1, 1);
        this.ball_radius = 0.25;

        this.system = new SpringParticleSystem()
        /*
        this.system.create_particles(4)
        this.system.set_particle(0, 1.0, .0, 5.0, 0.0, 0.0, 0.0, 0.0)
        this.system.set_particle(1, 1.0, .0, 5.0, 5.0, 0.0, 0.0, 0.0)
        this.system.set_particle(2, 1.0, 5.0, 5.0, 5.0, 0.0, 0.0, 0.0)
        this.system.set_particle(3, 1.0, 5.0, 5.0, .0, 0.0, 0.0, 0.0)
        this.system.create_springs(4)
        this.system.link(0, 0, 1, 5, 0.1, 3)
        this.system.link(1, 1, 2, 5, 0.1, 3)
        this.system.link(2, 2, 3, 5, 0.1, 3)
        this.system.link(3, 3, 0, 5, 0.1, 3)
        this.system.set_floor(5000, 1)
        this.system.gravity = vec3(0, -9.8, 0)
        */
        this.run = false

      }

      draw_particles(caller){

        for (let i=0; i<this.system.Np;i++){
          let pos = this.system.particles[i].pos
          let particle_transform = Mat4.translation(pos[0], pos[1], pos[2]).times(Mat4.scale(.1, .1, .1))

          this.shapes.ball.draw(caller, this.uniforms,particle_transform , { ...this.materials.metal, color: color( 0,0,1,1 ) } )
        }
      }

      draw_springs(caller){
        for (let i=0; i<this.system.Ns;i++){
          let s = this.system.springs[i]
          let start = this.system.particles[s.pi1].pos
          let end = this.system.particles[s.pi2].pos

          this.shapes.line.update(caller, this.uniforms, start, end)
          this.shapes.line.draw(caller, this.uniforms)
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
          Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
          //Shader.assign_camera( Mat4.look_at (vec3 (10, 10, 10), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
        }
        this.uniforms.projection_transform = Mat4.perspective( Math.PI/4, caller.width/caller.height, 1, 100 );

        // *** Lights: *** Values of vector or point lights.  They'll be consulted by
        // the shader when coloring shapes.  See Light's class definition for inputs.
        const t = this.t = this.uniforms.animation_time/1000;
        const angle = Math.sin( t );

        // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
        // !!! Light changed here
        const light_position = vec4(20 * Math.cos(angle), 20,  20 * Math.sin(angle), 1.0);
        this.uniforms.lights = [ defs.Phong_Shader.light_source( light_position, color( 1,1,1,1 ), 1000000 ) ];

        // draw axis arrows.
        //this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Part_two_spring extends Part_two_spring_base
{                                                    // **Collisions** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, My_Demo_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.
  render_animation( caller )
  {                                                // display():  Called once per frame of animation.  For each shape that you want to
    // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
    // different matrix value to control where the shape appears.

    // Variables that are in scope for you to use:
    // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
    // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
    // this.materials.metal:    Selects a shader and draws with a shiny surface.
    // this.materials.plastic:  Selects a shader and draws a more matte surface.
    // this.lights:  A pre-made collection of Light objects.
    // this.hover:  A boolean variable that changes when the user presses a button.
    // shared_uniforms:  Information the shader needs for drawing.  Pass to draw().
    // caller:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().

    // Call the setup code that we left inside the base class:
    super.render_animation( caller );

    /**********************************
     Start coding down here!!!!
     **********************************/
        // From here on down it's just some example shapes drawn for you -- freely
        // replace them with your own!  Notice the usage of the Mat4 functions
        // translation(), scale(), and rotation() to generate matrices, and the
        // function times(), which generates products of matrices.

    const blue = color( 0,0,1,1 ), yellow = color( 1,1,0,1 );

    const t = this.t = this.uniforms.animation_time/1000;

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    //this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    let dt = this.uniforms.animation_delta_time / 1000
    dt = Math.min(1/60, dt)

    let t_step = this.system.integration_timestep

    let t_sim = this.uniforms.animation_time/1000
    let t_next = t_sim + dt // t_sim is the simulation time
    for ( ; t_sim <= t_next; t_sim += t_step ) {
      if (this.run){
        this.system.update(t_step) // conduct simulation
      }

    }

    this.draw_particles(caller)
    this.draw_springs(caller)
  }



  render_controls()
  {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
    // buttons with key bindings for affecting this scene, and live info readouts.
    this.control_panel.innerHTML += "Part Two:";
    this.new_line();
    this.key_triggered_button( "Config", [], this.parse_commands );
    this.new_line();
    this.key_triggered_button( "Run", [], this.start );
    this.new_line();

    /* Some code for your reference
    this.key_triggered_button( "Copy input", [ "c" ], function() {
      let text = document.getElementById("input").value;
      console.log(text);
      document.getElementById("output").value = text;
    } );
    this.new_line();
    this.key_triggered_button( "Relocate", [ "r" ], function() {
      let text = document.getElementById("input").value;
      const words = text.split(' ');
      if (words.length >= 3) {
        const x = parseFloat(words[0]);
        const y = parseFloat(words[1]);
        const z = parseFloat(words[2]);
        this.ball_location = vec3(x, y, z)
        document.getElementById("output").value = "success";
      }
      else {
        document.getElementById("output").value = "invalid input";
      }
    } );
     */
  }

  parse_commands() {
    document.getElementById("output").value = "parse_commands";
    this.run = false
    let text = document.getElementById("input").value;
    let lines = text.split('\n')
    for(let l=0; l<lines.length; l++){
      let line = lines[l]
      let words = line.split(/\s+/).filter(Boolean)
      if (words[0] =="create"){
        if (words[1] == "particles") {
          let Np = parseInt(words[2])
          this.system.create_particles(Np)
        } else if (words[1] == "springs"){
          let Ns = parseInt(words[2])
          this.system.create_springs(Ns)
        }
      }

      else if(words[0] == "particle") {
        this.system.set_particle(
            parseInt(words[1]),
            parseFloat(words[2]),
            parseFloat(words[3]),
            parseFloat(words[4]),
            parseFloat(words[5]),
            parseFloat(words[6]),
            parseFloat(words[7]),
            parseFloat(words[8]),
        )
      }else if(words[0] == "all_velocities"){
        this.system.all_velocities(
            parseFloat(words[1]),
            parseFloat(words[2]),
            parseFloat(words[3]),
        )
      } else if(words[0] == "link"){
        this.system.link(
            parseInt(words[1]),
            parseInt(words[2]),
            parseInt(words[3]),
            parseFloat(words[4]),
            parseFloat(words[5]),
            parseFloat(words[6]),
        )
      } else if (words[0] == "ground"){
        this.system.set_floor(
            parseFloat(words[1]),
            parseFloat(words[2])
        )
      } else if (words[0] == "gravity"){
        this.system.gravity = vec3(0, -parseFloat(words[1]), 0)
      } else if (words[0] == "integration"){
        this.system.integration_method = words[1]
        this.system.integration_timestep = parseFloat(words[2])
      }
      else{
        console.log("undefined")
        console.log(words[0])
      }
    }
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    this.run = true
  }

}
