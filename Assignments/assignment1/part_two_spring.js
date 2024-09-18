import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

// TODO: you should implement the required classes here or in another file.
class Particle {
  constructor() {
    this.mass = 0.0;
    this.position = vec3(0, 0, 0);
    this.velocity = vec3(0, 0, 0);
    this.future_force = vec3(0, 0, 0);
    this.ext_force = vec3(0, 0, 0);
    this.pre_pos = vec3(0, 0, 0);
    this.valid = false;
  }

  update() {
    if (!this.valid)
      throw "Initialization not complete."
  }
}

class Spring {
  constructor() {
    this.particle1 = null;
    this.particle2 = null;
    this.ks = 0.0;
    this.kd = 0.0;
    this.len = 0.0;
    this.valid = true;
  }
  update() {
    if (!this.valid)
      throw "Initialization not complete."
  }
}

class Simulation {
  constructor() {
    this.particles = [];
    this.num_particles = 0;
    this.springs = [];
    this.num_springs = 0;
    this.gravity = vec3(0, 0, 0);
    this.ground_ks = 0;
    this.ground_kd = 0;
  }


  set_num_particles(n) {
    for (let i = 0; i < n; i++) {
      this.particles.push(new Particle());
    }
    this.num_particles = n;
  }

  set_num_springs(n) {
    for (let i = 0; i < n; i++) {
      this.springs.push(new Spring());
    }
    this.num_springs = n;
  }

  set_particle(idx, mass, x, y, z, vx, vy, vz) {
    let particle = this.particles[idx];
    particle.mass = mass;
    particle.position = vec3(x, y, z);
    particle.velocity = vec3(vx, vy, vz);
    particle.valid = true;
  }

  set_velocities(vx, vy, vz) {
    for (let i = 0; i < this.num_particles; i++) {
      this.particles[i].velocity = vec3(vx, vy, vz);
    }
  }

  set_forces() {
    for (let s of this.springs) {
      // console.log(s.len);
      let p1 = s.particle1;
      let p2 = s.particle2;
      s.update();
      p1.update();
      p2.update();
      let dij_hat = p2.position.minus(p1.position);
      let d = dij_hat.norm();
      dij_hat = dij_hat.times(1/d);
      let vij = p2.velocity.minus(p1.velocity);
      // console.log("length", d, s.len)
      // console.log((s.ks * (d - s.len)), (s.kd * vij.dot(dij_hat)));
      let force = dij_hat.times((s.ks * (d - s.len)) + (s.kd * vij.dot(dij_hat)));
      p1.ext_force = p1.ext_force.plus(force)
      p2.ext_force = p2.ext_force.minus(force)
      p1.future_force = p1.ext_force;
      p2.future_force = p2.ext_force;
    }
  }

  set_future_forces() {
    for (let s of this.springs) {
      let p1 = s.particle1;
      let p2 = s.particle2;
      let dij_hat = p2.position.minus(p1.position);
      let d = dij_hat.norm();
      dij_hat = dij_hat.times(1/d);
      let vij = p2.velocity.minus(p1.velocity);
      let force = dij_hat.times((s.ks * (d - s.len)) + (s.kd * vij.dot(dij_hat)));
      p1.future_force = p1.ext_force.plus(force)
      p2.future_force = p2.ext_force.minus(force)
    }
  }

  set_velos_and_poses(dt, method){
    for (let p of this.particles) {
      p.update();
      if (method === "euler") {
        p.pre_pos = p.position.copy();
        let v_copy = p.velocity.copy()
        p.velocity = p.velocity.plus(p.ext_force.times(dt / p.mass));
        p.position = p.position.plus(v_copy.times(dt));
      } else if (method === "symplectic") {
        p.pre_pos = p.position.copy();
        p.velocity = p.velocity.plus(p.ext_force.times(dt / p.mass));
        p.position = p.position.plus(p.velocity.times(dt));
      } else if (method === "verlet") {
        p.pre_pos = p.position.copy();
        let a = p.ext_force.times(1/p.mass);
        p.position = p.pre_pos.plus(p.velocity.times(dt));
        p.position = p.position.plus(a.times(Math.pow(dt, 2) / 2));
      }
    }
    if (method ==="verlet") {
      for (let p of this.particles) {
        let a = p.ext_force.times(1/p.mass);
        let velocity = p.velocity.copy();
        this.set_future_forces();
        let future_a = p.future_force.times(1 / p.mass);
        p.velocity = velocity.plus((a.plus(future_a)).times(dt / 2));
      }
    }
  }

  link (sindex, pindex1, pindex2, ks, kd, len) {
    this.springs[sindex].particle1 = this.particles[pindex1];
    this.springs[sindex].particle2 = this.particles[pindex2];
    this.springs[sindex].ks = ks;
    this.springs[sindex].kd = kd;
    this.springs[sindex].len = len;
    this.springs[sindex].valid = true;
  }

  ground(ks, kd) {
    this.ground_ks = ks;
    this.ground_kd = kd;
  }

  set_gravity(g) {
    this.gravity[1] = -g;
  }

  update(dt, integration) {
    for (const p of this.particles) {
      p.ext_force = this.gravity.times(p.mass);
      if (p.position[1] < 0) {
        let collision = (0 - p.pre_pos[1]) / (p.position[1] - p.pre_pos[1]);
        let col_pos = vec3(collision * (p.position[0] - p.pre_pos[0]) + p.pre_pos[0],
            0, collision * (p.position[2] - p.pre_pos[2]) + p.pre_pos[2]);
        let pg = vec3(2 * p.position[0] - col_pos[0], 0, 2 * p.position[2] - col_pos[2]);
        let n_hat = vec3(0, 1, 0);
        let for_ks = (pg.minus(p.position)).dot(n_hat);
        let fn = n_hat.times(this.ground_ks * for_ks + this.ground_kd * p.velocity.dot(n_hat));
        console.log(p.ext_force[1], fn[1]);
        p.ext_force = p.ext_force.plus(fn);
      }
    }
    this.set_forces()
    this.set_velos_and_poses(dt, integration);
  }
}

export
const Part_two_spring_base = defs.Part_two_spring_base =
    class Part_two_spring_base extends Component
    {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
                                               // This particular scene is broken up into two pieces for easier understanding.
                                               // The piece here is the base class, which sets up the machinery to draw a simple
                                               // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
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
          'axis' : new defs.Axis_Arrows() };

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

        // TODO: you should create the necessary shapes
        this.simulation = new Simulation();
        this.integration = "";
        this.timestep = 0;
        this.running = false;
      }

      render_animation( caller )
      {                                                // display():  Called once per frame of animation.  We'll isolate out
        // the code that actually draws things into Part_one_hermite, a
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
        this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
      }
    }


export class Part_two_spring extends Part_two_spring_base
{                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
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

    const blue = color( 0,0,1,1 ), yellow = color( 1,1,0,1 ), red = color(1, 0, 0, 1);

    // !!! Draw ground
    let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
    this.shapes.box.draw( caller, this.uniforms, floor_transform, { ...this.materials.plastic, color: yellow } );

    // !!! Draw ball (for reference)
    let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
        .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
    this.shapes.ball.draw( caller, this.uniforms, ball_transform, { ...this.materials.metal, color: blue } );

    // TODO: you should draw spline here.
    let dt = this.timestep;

    if (this.running) {
      this.t_sim = 0
      const t_next = this.t_sim + dt;
      while (this.t_sim < t_next) {
        this.simulation.update(dt, this.integration);
        this.t_sim += this.timestep;
      }

      for (const p of this.simulation.particles) {
        const pos = p.position;
        let  model_transform = Mat4.scale(0.2, 0.2, 0.2);
        // if (pos[1] < 0) pos[1] = 0;
        model_transform.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
        this.shapes.ball.draw(caller, this.uniforms, model_transform, { ...this.materials.plastic, color: blue});
      }

      for (const s of this.simulation.springs) {
        const p1 = s.particle1.position;
        const p2 = s.particle2.position;
        const len = (p2.minus(p1)).norm();
        const center = (p1.plus(p2)).times(0.5);

        let model_transform = Mat4.scale(0.05, len/2, 0.05);

        const p = p1.minus(p2).normalized();
        let v = vec3(0, 1, 0);
        if (Math.abs(v.cross(p).norm()) < 0.1) {
          v = vec3(0, 0, 1);
          model_transform = Mat4.scale(0.05, 0.05, len / 2);
        }
        const w = v.cross(p).normalized();
        const theta = Math.acos(v.dot(p));
        model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
        model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]))
        this.shapes.box.draw(caller, this.uniforms, model_transform, { ...this.materials.metal, color: red});

      }
    }
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
    let text = document.getElementById("input").value;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const words = lines[i].replace(/\s+/g, ' ').split(' ');
      if (lines[i].startsWith('create particles') && words.length === 3) {
          const n = parseInt(words[2]);
          this.simulation.set_num_particles(n);
        console.log(1)
      } else if (lines[i].startsWith('particle') && words.length === 9) {
          const idx = parseInt(words[1]);
          const mass = parseFloat(words[2]);
          const x = parseFloat(words[3]);
          const y = parseFloat(words[4]);
          const z = parseFloat(words[5]);
          const vx = parseFloat(words[6]);
          const vy = parseFloat(words[7]);
          const vz = parseFloat(words[8]);
          this.simulation.set_particle(idx, mass, x, y, z, vx, vy, vz);
        console.log(2)
      } else if (lines[i].startsWith('all_velocities') && words.length === 4) {
          const vx = parseFloat(words[1]);
          const vy = parseFloat(words[2]);
          const vz = parseFloat(words[3]);
          this.simulation.set_velocities(vx, vy, vz);
        console.log(3)
      } else if (lines[i].startsWith('create springs') && words.length === 3) {
          const n = parseInt(words[2]);
          this.simulation.set_num_springs(n);
        console.log(4)
      } else if (lines[i].startsWith('link') && words.length === 7) {
          const sindex = parseInt(words[1]);
          const pindex1 = parseInt(words[2]);
          const pindex2 = parseInt(words[3]);
          const ks = parseFloat(words[4]);
          const kd = parseFloat(words[5]);
          const len = parseFloat(words[6]);
          // console.log(len);
          this.simulation.link(sindex, pindex1, pindex2, pindex2, ks, kd, len);
          this.simulation.springs[sindex].len = len;
          // console.log(this.simulation.springs[sindex].len);
          console.log(5)
      } else if (lines[i].startsWith('integration') && words.length === 3) {
          this.integration = words[1];
          this.timestep = parseFloat(words[2]);
        console.log(6)
      } else if (lines[i].startsWith('ground') && words.length === 3) {
          let ground_ks = parseFloat(words[1]);
          let ground_kd = parseFloat(words[2]);
          this.simulation.ground(ground_ks, ground_kd);
        console.log(7)
      } else if (lines[i].startsWith('gravity') && words.length === 2) {
          let g = parseFloat(words[1]);
          this.simulation.set_gravity(g);
        console.log(8)
      } else if (lines[i].length > 0) {
          document.getElementById("output").value = "invalid input";
          console.log(lines[i], words.length);
      }
    }
    return;
  }

  start() { // callback for Run button
    document.getElementById("output").value = "start";
    //TODO
    this.running = true;
  }
}
