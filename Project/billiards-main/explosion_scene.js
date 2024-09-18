import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;
import {Line, PhysicsEngine, Ball, BallPhong} from './ball_physics.js';
import {Table} from "./table.js";
import {Articulated_Human, HumanController} from "./human.js";
import { TrajectoryArrow } from './control.js';
import { SphericalExplosion } from './ball_physics.js';

export const ExplosionBase = defs.MainBase =
	class ExplosionBase extends Component {
		init() {
			console.log("init")
			this.shapes = {
				'box': new defs.Cube(),
				'ball': new defs.Subdivision_Sphere(4),
				'axis': new defs.Axis_Arrows(),
				'line': new Line(),
                'circle': new defs.Regular_2D_Polygon(1, 16)
			};
			const phong = new defs.Phong_Shader();
			const tex_phong = new defs.Textured_Phong();
			const ballshader = new BallPhong()


			this.materials = {};

			this.materials.rgb = {shader: tex_phong, ambient: .5, texture: new Texture("assets/rgb.jpg")}
			this.materials.ballmaterial = {
					shader: ballshader,
					ambient: .8,
					diffusivity: 1,
					specularity: 1,
					color: color(.9, .5, .9, 1)
			}
            this.materials.plastic = { shader: phong, ambient: .2, diffusivity: 1, specularity: .5, color: color( 1.0,1.0,1.0,1 ) }

			this.ball_location = vec3(1, 1, 1);
			this.ball_radius = 0.25;

            this.particle_radius = 0.08;
            this.num_particles = 40;
			this.explosion = new SphericalExplosion(vec4(1, 1, 1, 1), this.ball_radius, this.num_particles, this.particle_radius, 8);
		}


		render_animation(caller) {  // display():  Called once per frame of animation.  We'll isolate out
			// the code that actually draws things into Collisions, a
			// subclass of this Scene.  Here, the base class's display only does
			// some initial setup.

			// Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
			if (!caller.controls) {
				this.animated_children.push(caller.controls = new defs.Movement_Controls({uniforms: this.uniforms}));
				caller.controls.add_mouse_controls(caller.canvas);

				// Define the global camera and projection matrices, which are stored in shared_uniforms.  The camera
				// matrix follows the usual format for transforms, but with opposite values (cameras exist as
				// inverted matrices).  The projection matrix follows an unusual format and determines how depth is
				// treated when projecting 3D points onto a plane.  The Mat4 functions perspective() or
				// orthographic() automatically generate valid matrices for one.  The input arguments of
				// perspective() are field of view, aspect ratio, and distances to the near plane and far plane.

				// !!! Camera changed here
				Shader.assign_camera(Mat4.look_at(vec3(10, 4, -8), vec3(0, 0, 1), vec3(0, 1, 0)), this.uniforms);
				//Shader.assign_camera( Mat4.look_at (vec3 (0, 0, 3), vec3 (0, 0, 0), vec3 (0, 1, 0)), this.uniforms );
			}
			this.uniforms.projection_transform = Mat4.perspective(Math.PI / 4, caller.width / caller.height, 1, 100);

			// *** Lights: *** Values of vector or point lights.  They'll be consulted by
			// the shader when coloring shapes.  See Light's class definition for inputs.
			const t = this.t = this.uniforms.animation_time / 1000;

			const light_position = vec4(20, 20, 20, 1.0);
			this.uniforms.lights = [defs.Phong_Shader.light_source(light_position, color(1, 1, 1, 1), 1000)];
		}
	}

export class Explosion extends ExplosionBase {
	render_animation(caller) {
		super.render_animation(caller);

		/**********************************
		Start coding down here!!!!
		**********************************/

		const t = this.t = this.uniforms.animation_time / 1000;


		let dt = this.uniforms.animation_delta_time / 1000
		dt = Math.min(1 / 60, dt)
		let t_step = 1 / 1000

		let t_sim = this.uniforms.animation_time / 1000
		let t_next = t_sim + dt // t_sim is the simulation time

		for (; t_sim <= t_next; t_sim += t_step) {
			// this.physics.collide_walls(this.balls)
			// this.physics.apply_friction(this.balls)
			// this.physics.update_velocity(this.balls, t_step)
			// this.physics.update_positions(this.balls, t_step)
            if (t > 2) {
				this.explosion.update_position(t_step);
			}
		}

        // this.shapes.ball.draw(caller, this.uniforms, Mat4.scale(this.particle_radius, this.particle_radius, this.particle_radius), this.materials.plastic);
        if (!this.explosion.done) {
			for (const p of this.explosion.particles) {
				let transform = Mat4.scale(p.radius, p.radius, p.radius);
				transform.pre_multiply(Mat4.translation(p.position[0], p.position[1], p.position[2]));
				this.shapes.ball.draw(caller, this.uniforms, transform, this.materials.plastic);
			}
		} else {
			// console.log("done")
		}
    }

	render_controls() { // render_controls(): Sets up a panel of interactive HTML elements, including
		// render_controls(): Sets up a panel of interactive HTML elements, including
		// buttons with key bindings for affecting this scene, and live info readouts.
		this.control_panel.innerHTML += "Assignment 2: IK Engine";
		this.new_line();
		// TODO: You can add your button events for debugging. (optional)
		// this.key_triggered_button("Debug", ["Shift", "D"],
		// 	() => this.human_controller.start_move(0, 0.3, 5, 0, 0, 15));
			
		// this.key_triggered_button("Aim right", ["l"],
		// 	() => this.trajectory_arrow.adjust_angle(-Math.PI * this.dtheta));
		// this.key_triggered_button("Aim left", ["j"],
		// 	() => this.trajectory_arrow.adjust_angle(Math.PI * this.dtheta));
		// this.key_triggered_button("Increase speed", ["i"],
		// 	() => this.trajectory_arrow.adjust_length(this.dvelocity));
		// this.key_triggered_button("Increase speed", ["k"],
		// 	() => this.trajectory_arrow.adjust_length(-this.dvelocity));
		this.new_line();
	}
}

