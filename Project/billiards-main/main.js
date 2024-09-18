import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;
import {Line, PhysicsEngine, Ball, BallPhong} from './ball_physics.js';
import {Table} from "./table.js";
import {Articulated_Human, HumanController} from "./human.js";
import {TrajectoryArrow} from './control.js';
import {SphericalExplosion} from './ball_physics.js';
import {BALL_COLORS} from "./configs.js";
import {Spline} from "./ball_spline.js";
import { Texture_Cube, Skybox_Shader, Background } from './skybox.js';

export const MainBase = defs.MainBase =
	class MainBase extends Component {
		init() {
			console.log("init")
			this.shapes = {
				'box': new defs.Cube(),
				'ball': new defs.Subdivision_Sphere(4),
				'axis': new defs.Axis_Arrows(),
				'line': new Line()
			};
			const phong = new defs.Phong_Shader();
			const tex_phong = new defs.Textured_Phong();
			const ballshader = new BallPhong();
			const skybox_faces = [
				"assets/sky_right.png",
				"assets/sky_left.png",
				"assets/sky_top.png",
				"assets/sky_bottom.png",
				"assets/sky_front.png",
				"assets/sky_back.png"
			]

			this.materials = {};
			this.background = new Background("sky", this.shapes.box);
			this.materials.rgb = {shader: tex_phong, ambient: .5, texture: new Texture("assets/rgb.jpg")}
			this.materials.ballmaterial = {
				shader: ballshader,
				ambient: .8,
				diffusivity: 1,
				specularity: 1,
				color: color(.9, .5, .9, 1)
			}
			this.materials.ground_material = {
				shader: phong,
				ambient: .8,
				diffusivity: 1,
				specularity: 0.1,
				color: color(.2, .1, .7, 1)
			}

			this.ball_location = vec3(1, 1, 1);
			this.ball_radius = 0.25;
			this.init_balls(16);
			this.trajectory_arrow = new TrajectoryArrow(vec3(this.balls[0].position[0],
				this.ball_radius,
				this.balls[0].position[2]));
			this.trajectory_arrow.offset += 2 * this.ball_radius;
			this.dtheta = 0.01;
			this.dvelocity = 0.1;

			this.table_dimensions = {"x": 4, "y": 6};
			this.trajectory_arrow.len_range[1] = this.table_dimensions.y;

			// BALL PHYSICS
			this.physics = new PhysicsEngine(
				-this.table_dimensions.x, this.table_dimensions.x, this.table_dimensions.y, -this.table_dimensions.y);
			// TABLE
			this.table = new Table(this.table_dimensions.x, this.table_dimensions.y);
			// HUMAN
			this.human_controller = new HumanController();
			// this.human = new Articulated_Human();

			// EXPLOSION
			this.explosions = [];	// populate as ball reach hole
			this.particle_radius = 0.08;
			this.num_particles = 20; // can be changed if too computational intense in combo w ik
			this.max_exp_speed = 10;
			this.balls_in_holes = []; // to make resetting easier

			// STATES
			this.states = {
				"wait": 0,
				"body_moving": 1,
			}
			this.current_state = this.states.wait;
			this.splines = [];
			this.reset_balls = false;
			this.spline_t = 0
		}

		init_balls(N) {
			// first ball will be cue ball
			this.balls = []
			const init_v = 6
			const init_p = 3
			this.initial_positions = [];

			if (N > 0) {
				this.balls.push(new Ball(color(1.0, 1.0, 1.0, 1.0), 0, true));
				this.balls[0].position = vec3(0, 0, init_p + 1);
				this.balls[0].velocity = vec3(0, 0, 0.01);
				this.initial_positions.push(this.balls[0].position);
			}

			const color_names = Object.keys(BALL_COLORS);
			let x = 0;
			let z = init_p - 2.5;
			let dist = 0.3;
			let ball_idx = 1;

			for (let i = 0; i < 5; i++) {
				for (let j = -dist * i; j <= dist * i + 0.1; j += dist * 2) {
					const curr_color = BALL_COLORS[color_names[ball_idx % color_names.length]];
					this.balls.push(new Ball(color(...curr_color, 1.0), ball_idx));
					// this.balls.push(new Ball(color(Math.random(), Math.random(), Math.random(), 1.0)));
					this.balls[ball_idx].position = vec3(x + j + (Math.random() - 0.5) * 0.1, 0, z - dist * i + Math.random() * 0.1);
					this.initial_positions.push(this.balls[ball_idx].position);
					this.balls[ball_idx].velocity = vec3(0.01, 0, 0.01);
					this.balls[ball_idx].visible = true;
					ball_idx += 1;
				}
			}
		}

		draw_ball(ball, caller) {
			let m = ball.rotation_matrix
			m = Mat4.scale(ball.radius, ball.radius, ball.radius).times(m)
			m = Mat4.translation(ball.position[0], ball.radius + 0.01, ball.position[2]).times(m) // radius + height of the board
			this.shapes.ball.draw(caller, this.uniforms, m, {...this.materials.ballmaterial, color: ball.color})
			//this.shapes.ball.draw(caller, this.uniforms, m, this.materials.metal)
		}

		draw_balls(caller) {
			for (let i = 0; i < this.balls.length; i++) {
				//if (this.balls[i].on_board){
				if (this.balls[i].visible) {
					this.draw_ball(this.balls[i], caller)
				}
			}
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

export class Main extends MainBase {
	render_animation(caller) {
		super.render_animation(caller);

		/**********************************
		Start coding down here!!!!
		 **********************************/

		const t = this.t = this.uniforms.animation_time / 1000;

		this.background.draw_sky(caller, this.uniforms);
		this.background.draw_ground(caller, this.uniforms, this.shapes.box, this.materials.ground_material);

		let dt = this.uniforms.animation_delta_time / 1000
		dt = Math.min(1 / 60, dt)
		let t_step = 1 / 1000

		let t_sim = this.uniforms.animation_time / 1000
		let t_next = t_sim + dt // t_sim is the simulation time

		for (; t_sim <= t_next; t_sim += t_step) {
			this.physics.collide_walls(this.balls)
			this.physics.apply_friction(this.balls)
			this.physics.update_velocity(this.balls, t_step)
			this.physics.update_positions(this.balls, t_step)
			for (let e of this.explosions) {
				e.update_position(t_step);
			}
		}
		this.draw_balls(caller);
		this.trajectory_arrow.draw(caller, this.uniforms);
		this.physics.collide_balls(this.balls);
		this.physics.update_rotation(this.balls, dt)

		// Hole resolution and explosions
		this.physics.hole_collision(this.balls, this.table)
		for (let [i, b] of this.balls.entries()) {
			if ((!this.reset_balls) && (!b.on_board) && (this.balls[i].visible)) {
				let explosion = new SphericalExplosion(b.position.to4(true), this.ball_radius,
					this.num_particles, this.particle_radius, this.max_exp_speed)
				explosion.ball = i;
				this.explosions.push(explosion)
				this.balls.splice(i, 1);
				if (!i == 0) {
					this.balls_in_holes.push(b);
				}
			}
		}
		for (let [i, e] of this.explosions.entries()) {
			if (!e.done) {
				for (const p of e.particles) {
					// only display particle above table -- can change!
					if (p.position[1] - this.particle_radius > 0.01) {
						let transform = Mat4.scale(p.radius, p.radius, p.radius);
						transform.pre_multiply(Mat4.translation(e.center[0], e.center[1], e.center[2]));
						transform.pre_multiply(Mat4.translation(p.position[0], p.position[1], p.position[2]));
						this.shapes.ball.draw(caller, this.uniforms, transform, {
							...this.materials.ballmaterial,
							color: color(1, 1, 1, 1)
						});
					}
				}
			} else {
				this.explosions.splice(i, 1);
			}
		}

		// HUMAN
		if (this.human_controller.moving) {
			this.human_controller.move(dt, caller, this.uniforms);
		} else {
			if (this.current_state === this.states.body_moving) {
				this.current_state = this.states.wait;
				const arrow_vel = this.trajectory_arrow.get_pos_vel().slice(3, 6);
				this.balls[0].position = vec3(0, 0, 4);
				this.balls[0].velocity = vec3(...arrow_vel.map(x => x * 2));
			}
		}
		this.human_controller.draw(caller, this.uniforms);
		// TABLE
		this.table.draw(caller, this.uniforms);

		if (this.reset_balls && this.splines.length === this.balls.length) {
			let dif = 0;
			for (let i = 0; i < this.balls.length; i++) {
				let spline = this.splines[i];
				this.balls[i].position = spline.get_position(this.spline_t);
				dif += this.balls[i].position.minus(this.initial_positions[i]).norm();
			}
			// this.spline_t += t_sim / 1000;
			this.spline_t += 10 * t_step ;
			if (Math.abs(this.spline_t - Math.PI / 2) < 0.1) {
				console.log("dif", Math.abs(this.spline_t - Math.PI / 2));
				this.spline_t = 0;
				this.splines = [];
				this.reset_balls = false;
				for (let i = 0; i < this.balls.length; i++) {
					this.balls[i].on_board = true;
				}
				console.log(this.balls)
			}
		}
	}

	render_controls() { // render_controls(): Sets up a panel of interactive HTML elements, including
		// render_controls(): Sets up a panel of interactive HTML elements, including
		// buttons with key bindings for affecting this scene, and live info readouts.
		this.control_panel.innerHTML += "Project";
		this.new_line();
		// TODO: You can add your button events for debugging. (optional)
		this.key_triggered_button("Debug", ["Shift", "d"],
			() => this.human_controller.start_move(0, 0.3, 5, 0, 0, 15));

		this.key_triggered_button("Aim right", ["l"],
			() => this.trajectory_arrow.adjust_angle(-Math.PI * this.dtheta));
		this.key_triggered_button("Aim left", ["j"],
			() => this.trajectory_arrow.adjust_angle(Math.PI * this.dtheta));
		this.key_triggered_button("Increase speed", ["i"],
			() => this.trajectory_arrow.adjust_length(this.dvelocity));
		this.key_triggered_button("Decrease speed", ["k"],
			() => this.trajectory_arrow.adjust_length(-this.dvelocity));
		this.new_line();
		this.key_triggered_button("Start", ["m"],
			() => {
				this.human_controller.start_move(...this.trajectory_arrow.get_pos_vel());
				this.current_state = this.states.body_moving;
				this.balls[0].color = color(1, 1, 1, 1);
				this.balls[0].position = vec3(0, 0, 4);
				this.balls[0].velocity = vec3(0, 0, 0.01);
				this.balls[0].visible = true;
				this.balls[0].on_board = true;
			});
		this.key_triggered_button("Restart", ["e"],
			() => {
				console.log(this.balls[0]);
				this.reset_balls = true;
				this.balls.push(...this.balls_in_holes);
				for (let b of this.balls) {
					b.velocity = vec3(0, 0, 0.01);
				}
				this.balls_in_holes = [];
				this.splines = [];
				for (let i = 0; i < this.balls.length; i++) {
					this.splines.push(new Spline());
					let spline = this.splines[i];
					spline.add_point(this.balls[i].position.copy());
					let init_pos = this.initial_positions[this.balls[i].index];
					spline.add_point(init_pos.copy());
					this.spline_t = 0;
					if (!this.balls[i].visible) {
						this.balls[i].visible = true;
					}
				}


			});
	}
}

