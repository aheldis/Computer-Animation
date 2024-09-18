import {tiny, defs} from './examples/common.js';
import {Cue} from "./cue.js";

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix} = tiny;

const shapes = {
	'sphere': new defs.Subdivision_Sphere(5),
	'capped_cylinder': new defs.Rounded_Capped_Cylinder(30, 30),
};

export const Articulated_Human =
	class Articulated_Human {
		constructor() {
			const sphere_shape = shapes.sphere;
			const phong = new defs.Phong_Shader();
			const tex_phong = new defs.Textured_Phong();
			this.materials = {};
			this.materials.plastic = {
				shader: phong,
				ambient: .5,
				diffusivity: .5,
				specularity: .5,
				color: color(.9, .5, .9, 1)
			};
			this.materials.cue_wood = {
				shader: phong,
				ambient: .5,
				diffusivity: .9,
				specularity: .5,
				color: color(184 / 255, 90 / 255, 27 / 255, 1)
			};

			this.human_cfg = {
				root_loc: [-1, 1, 7],
				torso_scale: [.6, 1.8, 0.5],

			};

			// torso node
			const torso_transform = Mat4.scale(...this.human_cfg.torso_scale);
			this.torso_node = new Node("torso", sphere_shape, torso_transform);
			// root->torso
			const root_location = Mat4.translation(...this.human_cfg.root_loc);
			this.root = new Arc("root", null, this.torso_node, root_location);

			// head node
			let head_transform = Mat4.scale(.6, .6, .6);
			head_transform.pre_multiply(Mat4.translation(0, .6, 0));
			this.head_node = new Node("head", sphere_shape, head_transform);
			// torso->neck->head
			const neck_location = Mat4.translation(0, 2, 0);
			this.neck = new Arc("neck", this.torso_node, this.head_node, neck_location);
			this.torso_node.children_arcs.push(this.neck);

			// right upper arm node
			let ru_arm_transform = Mat4.scale(1.2, .2, .2);
			ru_arm_transform.pre_multiply(Mat4.translation(1.2, 0, 0));
			this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
			// torso->r_shoulder->ru_arm
			const r_shoulder_location = Mat4.translation(0.5, 1.8, 0);
			this.r_shoulder = new Arc("r_shoulder", this.torso_node, this.ru_arm_node, r_shoulder_location);
			this.torso_node.children_arcs.push(this.r_shoulder)
			this.r_shoulder.set_dof(true, true, true);

			// right lower arm node
			let rl_arm_transform = Mat4.scale(1, .2, .2);
			rl_arm_transform.pre_multiply(Mat4.translation(1, 0, 0));
			this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
			// ru_arm->r_elbow->rl_arm
			const r_elbow_location = Mat4.translation(2.4, 0, 0);
			this.r_elbow = new Arc("r_elbow", this.ru_arm_node, this.rl_arm_node, r_elbow_location);
			this.ru_arm_node.children_arcs.push(this.r_elbow)
			this.r_elbow.set_dof(true, true, false);

			// right hand node
			let r_hand_transform = Mat4.scale(.4, .3, .2);
			r_hand_transform.pre_multiply(Mat4.translation(0.4, 0, 0));
			this.r_hand_node = new Node("r_hand", sphere_shape, r_hand_transform);
			// rl_arm->r_wrist->r_hand
			const r_wrist_location = Mat4.translation(2, 0, 0);
			this.r_wrist = new Arc("r_wrist", this.rl_arm_node, this.r_hand_node, r_wrist_location);
			this.rl_arm_node.children_arcs.push(this.r_wrist);
			this.r_wrist.set_dof(true, false, true);

			// CUE
			// let cue_transform = Mat4.scale(.05, .05, 4.5);
			// cue_transform.pre_multiply(Mat4.translation(0.1, 0, 1));
			// this.cue_node = new Node("cue", shapes.capped_cylinder, cue_transform);
			// // rl_arm->r_wrist->r_hand->cue
			// const cue_location = Mat4.translation(0.4, 0, 0);
			// this.cue = new Arc("cue_joint", this.r_hand_node, this.cue_node, cue_location);
			// this.r_hand_node.children_arcs.push(this.cue);


			// add the only end-effector
			// const r_hand_end_local_pos = vec4(0, 0, 3.4, 1);
			// this.end_effector = new End_Effector("cue", this.cue, r_hand_end_local_pos);
			// this.cue.end_effector = this.end_effector;
			const r_hand_end_local_pos = vec4(.5, 0, 0, 1);
			this.end_effector = new End_Effector("r_hand", this.r_hand_node, r_hand_end_local_pos);
			this.r_wrist.end_effector = this.end_effector;


			// LEFT
			// left upper arm node
			let lu_arm_transform = Mat4.scale(1.2, .2, .2);
			lu_arm_transform.pre_multiply(Mat4.translation(-1.2, 0, 0));
			this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
			// torso->l_shoulder->lu_arm
			const l_shoulder_location = Mat4.translation(-0.6, 1.8, 0);
			this.l_shoulder = new Arc("l_shoulder", this.torso_node, this.lu_arm_node, l_shoulder_location);
			this.torso_node.children_arcs.push(this.l_shoulder)
			this.l_shoulder.set_dof(true, true, true);

			// left lower arm node
			let ll_arm_transform = Mat4.scale(1, .2, .2);
			ll_arm_transform.pre_multiply(Mat4.translation(-1, 0, 0));
			this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
			// lu_arm->l_elbow->ll_arm
			const l_elbow_location = Mat4.translation(-2.4, 0, 0);
			this.l_elbow = new Arc("l_elbow", this.lu_arm_node, this.ll_arm_node, l_elbow_location);
			this.lu_arm_node.children_arcs.push(this.l_elbow)
			this.l_elbow.set_dof(true, true, false);
			// left hand node
			let l_hand_transform = Mat4.scale(.4, .3, .2);
			l_hand_transform.pre_multiply(Mat4.translation(-0.4, 0, 0));
			this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
			// ll_arm->l_wrist->l_hand
			const l_wrist_location = Mat4.translation(-2, 0, 0);
			this.l_wrist = new Arc("l_wrist", this.ll_arm_node, this.l_hand_node, l_wrist_location);
			this.ll_arm_node.children_arcs.push(this.l_wrist);
			this.l_wrist.set_dof(true, false, true);

			// LEGS
			let ru_leg_transform = Mat4.scale(.2, 0.5, .2);
			ru_leg_transform.pre_multiply(Mat4.translation(.4, -2, 0));
			this.ru_leg_node = new Node("ru_leg", sphere_shape, ru_leg_transform);
			// torso->r_leg_joint1->ru_leg1
			const r_leg_joint1_location = Mat4.translation(0, -0.2, 0);
			this.r_leg_joint1 = new Arc("r_leg_joint1", this.torso_node, this.ru_leg_node, r_leg_joint1_location);
			this.torso_node.children_arcs.push(this.r_leg_joint1)
			this.r_leg_joint1.set_dof(true, true, true);
			// right lower leg node
			let rl_leg_transform = Mat4.scale(0.2, 0.5, .2);
			rl_leg_transform.pre_multiply(Mat4.translation(0.4, -2.6, 0));
			this.rl_leg_node = new Node("rl_leg", sphere_shape, rl_leg_transform);
			// ru_leg->r_joint2->rl_leg
			const r_leg_joint2_location = Mat4.translation(0, -0.3, 0);
			this.r_leg_joint2 = new Arc("r_leg_joint2", this.ru_leg_node, this.rl_leg_node, r_leg_joint2_location);
			this.ru_leg_node.children_arcs.push(this.r_leg_joint2)
			this.r_leg_joint2.set_dof(true, true, false);
			// right foot node
			let r_foot_transform = Mat4.scale(.2, .3, .4);
			r_foot_transform.pre_multiply(Mat4.translation(0.4, -3.0, -.2));
			this.r_foot_node = new Node("r_foot", sphere_shape, r_foot_transform);
			// rl_leg->r_leg_joint2->r_foot
			const r_foot_location = Mat4.translation(0, -0.3, 0);
			this.r_leg_joint3 = new Arc("r_leg_joint3", this.rl_leg_node, this.r_foot_node, r_foot_location);
			this.rl_leg_node.children_arcs.push(this.r_leg_joint3);
			this.r_leg_joint3.set_dof(true, false, true);

			let lu_leg_transform = Mat4.scale(.2, 0.5, .2);
			lu_leg_transform.pre_multiply(Mat4.translation(-.4, -2, 0));
			this.lu_leg_node = new Node("lu_leg", sphere_shape, lu_leg_transform);
			// torso->l_leg_joint1->lu_leg1
			const l_leg_joint1_location = Mat4.translation(0, -0.2, 0);
			this.l_leg_joint1 = new Arc("l_leg_joint1", this.torso_node, this.lu_leg_node, l_leg_joint1_location);
			this.torso_node.children_arcs.push(this.l_leg_joint1)
			this.l_leg_joint1.set_dof(true, true, true);
			// left lower leg node
			let ll_leg_transform = Mat4.scale(0.2, 0.5, .2);
			ll_leg_transform.pre_multiply(Mat4.translation(-0.4, -2.6, 0));
			this.ll_leg_node = new Node("ll_leg", sphere_shape, ll_leg_transform);
			// ru_leg->r_joint2->rl_leg
			const l_leg_joint2_location = Mat4.translation(0, -0.3, 0);
			this.l_leg_joint2 = new Arc("l_leg_joint2", this.lu_leg_node, this.ll_leg_node, l_leg_joint2_location);
			this.lu_leg_node.children_arcs.push(this.l_leg_joint2)
			this.l_leg_joint2.set_dof(true, true, false);
			// left foot node
			let l_foot_transform = Mat4.scale(.2, .3, .4);
			l_foot_transform.pre_multiply(Mat4.translation(-0.4, -3.0, -.2));
			this.l_foot_node = new Node("l_foot", sphere_shape, l_foot_transform);
			// ll_leg->l_leg_joint2->l_foot
			const l_foot_location = Mat4.translation(0, -0.3, 0);
			this.l_leg_joint3 = new Arc("l_leg_joint3", this.ll_leg_node, this.l_foot_node, l_foot_location);
			this.ll_leg_node.children_arcs.push(this.l_leg_joint3);
			this.l_leg_joint3.set_dof(true, false, true);

			// JOINT INIT ROTATIONS
			this.l_shoulder.articulation_matrix.pre_multiply(Mat4.rotation(1.0, 0, 0, 1));
			this.l_shoulder.articulation_matrix.pre_multiply(Mat4.rotation(-1.0, 1, 0, 0));
			this.l_elbow.articulation_matrix.pre_multiply(Mat4.rotation(1.5, 0, 0, 1));
			this.l_elbow.articulation_matrix.pre_multiply(Mat4.rotation(1.9, 1, 0, 0));

			// this.r_shoulder.articulation_matrix.pre_multiply(Mat4.rotation(1.2, 0, 0, 1));
			// this.r_shoulder.articulation_matrix.pre_multiply(Mat4.rotation(1.0, 1, 0, 0));
			// this.r_elbow.articulation_matrix.pre_multiply(Mat4.rotation(-140 / 360 * 6.28, 0, 1, 0));
			// this.r_elbow.articulation_matrix.pre_multiply(Mat4.rotation(20 / 360 * 6.28, 0, 0, 1));

			this.root.articulation_matrix.pre_multiply(Mat4.rotation(-20 / 360 * 6.28, 1, 0, 0));
			this.r_leg_joint1.articulation_matrix.pre_multiply(Mat4.rotation(10 / 360 * 6.28, 1, 0, 0));
			this.l_leg_joint1.articulation_matrix.pre_multiply(Mat4.rotation(20 / 360 * 6.28, 1, 0, 0));

			// here I only use 7 dof
			this.dof = 7;
			this.Jacobian = null;
			// this.theta = [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01];
			// this.theta = [0, 0, 0, 0, 0, 0, 0];
			this.theta = [-0.7195828326280601, -0.3469771747754726, -0.8196895446147598, 1.179378091176949, 1.256796052649982, 2.48486777925487, -0.11516360945991651];
			this.apply_theta();
		}

		// mapping from global theta to each joint theta
		apply_theta() {
			// console.log(this.theta.slice(0, 3));
			// console.log(this.theta.slice(3, 5));
			this.theta[2] = Math.max(-1, Math.min(1, this.theta[2]));  // Limit shoulder
			this.theta[1] = Math.max(-1.3, Math.min(1.3, this.theta[1]));  // Limit shoulder
			this.theta[0] = Math.max(-1.2, Math.min(-0.8, this.theta[0]));  // Limit shoulder
			// this.theta[1] = 1
			// this.theta[0] = -1
			// this.theta[2] = 0
			// this.theta[3] = Math.max(-0.9, Math.min(0.9, this.theta[3]));  // Limit elbow
			// this.theta[4] = Math.max(-0.9, Math.min(1.0, this.theta[4]));  // Limit elbow
			// this.theta[3] = 0;
			this.theta[6] = -.5;
			this.r_shoulder.update_articulation(this.theta.slice(0, 3));
			this.r_elbow.update_articulation(this.theta.slice(3, 5));
			this.r_wrist.update_articulation(this.theta.slice(5, 7));
		}

		calculate_Jacobian() {
			let J = new Array(3);
			for (let i = 0; i < 3; i++) {
				J[i] = new Array(this.dof);
			}
			let ef_pos = this.get_end_effector_position();
			for (let j = 0; j < this.dof; j++) {
				const pi = 3.14159265
				if (this.theta[j] >= 2 * pi)
					this.theta[j] = 0.001
				if (this.theta[j] <= -2 * pi)
					this.theta[j] = 0.001
			}
			this.old_theta = this.theta.slice();
			for (let j = 0; j < this.dof; j++) {
				// let d_theta = -1e-7 * Math.sign(this.theta[j]);
				let d_theta = 1e-7 * Math.sign(Math.random() - 0.5);
				this.theta[j] += d_theta;
				this.apply_theta()
				let new_ef_pos = this.get_end_effector_position();

				let dx = new_ef_pos.minus(ef_pos);
				this.theta = this.old_theta.slice();
				this.apply_theta();
				this.get_end_effector_position();
				for (let i = 0; i < 3; i++) {
					J[i][j] = dx[i] / d_theta
				}
			}

			return J; // 3x7 in my case.
		}

		calculate_delta_theta(J, dx) {
			const A = math.multiply(math.transpose(J), J);
			const b = math.multiply(math.transpose(J), dx);
			let x = [...Array(this.dof)].map(e => Array(1).fill(0.01));
			try {
				x = math.lusolve(A, b)
			} catch (err) {
				console.log(err);
				let rand_theta = (Math.random() - 0.5) / 10
				// this.theta += [0, 0, 0, 0, 0, 0, 0];
				// this.apply_theta();
				this.move_end_effector_relative([[rand_theta], [rand_theta], [rand_theta]]);
				// x = this.theta.map((v, i) => v + dtheta[i][0]);
			}
			for (let i = 0; i < this.dof; i++) {
				const change_limit = 0.05;
				x[i][0] = Math.min(change_limit, Math.max(-change_limit, x[i][0]));
			}
			return x;
		}

		get_end_effector_position() {
			// in this example, we only have one end effector.
			this.matrix_stack = [];
			this._rec_update(this.root, Mat4.identity());
			const v = this.end_effector.global_position; // vec4
			return vec3(v[0], v[1], v[2]);
		}

		_rec_update(arc, matrix) {
			if (arc !== null) {
				const L = arc.location_matrix;
				const A = arc.articulation_matrix;
				matrix.post_multiply(L.times(A));
				this.matrix_stack.push(matrix.copy());

				if (arc.end_effector !== null) {
					arc.end_effector.global_position = matrix.times(arc.end_effector.local_position);
				}

				const node = arc.child_node;
				const T = node.transform_matrix;
				matrix.post_multiply(T);

				matrix = this.matrix_stack.pop();
				for (const next_arc of node.children_arcs) {
					this.matrix_stack.push(matrix.copy());
					this._rec_update(next_arc, matrix);
					matrix = this.matrix_stack.pop();
				}
			}
		}

		draw(webgl_manager, uniforms) {
			this.matrix_stack = [];
			this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms, this.materials.plastic);
		}

		_rec_draw(arc, matrix, webgl_manager, uniforms, material) {
			if (arc !== null) {
				const L = arc.location_matrix;
				const A = arc.articulation_matrix;
				matrix.post_multiply(L.times(A));
				this.matrix_stack.push(matrix.copy());

				const node = arc.child_node;
				const T = node.transform_matrix;
				matrix.post_multiply(T);
				if (node.name === "cue")
					material = this.materials.cue_wood;
				node.shape.draw(webgl_manager, uniforms, matrix, material);

				matrix = this.matrix_stack.pop();
				for (const next_arc of node.children_arcs) {
					this.matrix_stack.push(matrix.copy());
					this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
					matrix = this.matrix_stack.pop();
				}
			}
		}

		move_end_effector(target_pos) {
			let dx = target_pos.minus(this.get_end_effector_position());
			dx = [[dx[0]], [dx[1]], [dx[2]]];
			this.move_end_effector_relative(dx);
		}

		move_end_effector_relative(dx) {
			const J = this.calculate_Jacobian();
			const dtheta = this.calculate_delta_theta(J, dx);
			for (let i = 0; i < this.dof; i++)
				if (dtheta[i][0] === 0)
					dtheta[i][0] = dtheta[i][0] + 0.00000001 * (Math.random() - 0.5)
			this.theta = this.theta.map((v, i) => v + dtheta[i][0]);  // Help with when J=0
			this.apply_theta();
		}
	}

class Node {
	constructor(name, shape, transform) {
		this.name = name;
		this.shape = shape;
		this.transform_matrix = transform;
		this.children_arcs = [];
	}
}

class Arc {
	constructor(name, parent, child, location) {
		this.name = name;
		this.parent_node = parent;
		this.child_node = child;
		this.location_matrix = location;
		this.articulation_matrix = Mat4.identity();
		this.end_effector = null;
		this.dof = {
			Rx: false,
			Ry: false,
			Rz: false,
		}
	}

	// Here I only implement rotational DOF
	set_dof(x, y, z) {
		this.dof.Rx = x;
		this.dof.Ry = y;
		this.dof.Rz = z;
	}

	update_articulation(theta) {
		this.articulation_matrix = Mat4.identity();
		let index = 0;
		if (this.dof.Rx) {
			this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 1, 0, 0));
			index += 1;
		}
		if (this.dof.Ry) {
			this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 0, 1, 0));
			index += 1;
		}
		if (this.dof.Rz) {
			this.articulation_matrix.pre_multiply(Mat4.rotation(theta[index], 0, 0, 1));
		}
	}
}

class End_Effector {
	constructor(name, parent, local_position) {
		this.name = name;
		this.parent = parent;
		this.local_position = local_position;
		this.global_position = null;
	}
}

export class CurveShape extends Shape {
	constructor(spline, sample_count = 10000, curve_color = color(1, 0, 0, 1)) {
		super("position", "normal");

		this.material = {shader: new defs.Phong_Shader, ambient: 1, color: curve_color};
		this.sample_count = sample_count;

		if (spline.get_position && this.sample_count) {
			for (let i = 0; i < this.sample_count + 1; i++) {
				let t = i / this.sample_count;
				this.arrays.position.push(spline.get_position(t));
				this.arrays.normal.push(vec3(0, 0, 0));
			}
		}
	}

	draw(webgl_manager, uniforms) {
		super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
	}
}

export class HermiteSpline {
	constructor() {
		this.points = [];
		this.tangents = [];
		this.arc_length_table = []
		this.size = 0;
		this.hermite_mat = Matrix.of([1, 0, 0, 0], [0, 1, 0, 0], [-3, -2, 3, -1], [2, 1, -2, 1]);
		// this.add_point(0, 0, 0, -1, -1, 3);
		// this.add_point(2, 2, 2, 2, 2, 2);
		// this.add_point(5, 5, 5, 2, 2, 2);
	}

	add_point(x, y, z, tx, ty, tz) {
		this.points.push(vec3(x, y, z));
		this.tangents.push(vec3(tx, ty, tz));
		this.size++;
		this.update_arc_length_table()
	}

	set_tangent(idx, tx, ty, tz) {
		this.tangents[idx] = vec3(tx, ty, tz)
		this.update_arc_length_table()
	}

	set_point(idx, x, y, z) {
		this.points[idx] = vec3(x, y, z)
		this.update_arc_length_table()
	}

	get_position(t) {
		// t: [0,1]
		if (this.size < 2) {
			return vec3(0, t + 0.5, t ** 4)
		}
		let t_scaled = t * (this.size - 1)
		let t_frac = t_scaled % 1.0
		let A = Math.floor(t_scaled)
		let B = Math.ceil(t_scaled)
		let t_vec = Matrix.of([1, t_frac, t_frac ** 2, t_frac ** 3]);
		let control_vec = Matrix.of(
			this.points[A].copy(),
			this.tangents[A].copy().times(1 / (this.size - 1)),  //.times(2/this.size),
			this.points[B].copy(),
			this.tangents[B].copy().times(1 / (this.size - 1))  //.times(2/this.size)
		);
		let coeff_mat = t_vec.copy().times(this.hermite_mat.copy());
		let hermite_pos = coeff_mat.copy().times(control_vec.copy());
		hermite_pos = vec3(hermite_pos[0][0], hermite_pos[0][1], hermite_pos[0][2])
		return hermite_pos;
	}

	get_arc_length(sample_count = 10000) {
		let length = 0;
		let prev = this.get_position(0);
		for (let i = 1; i < (sample_count + 1); i++) {
			const t = i / sample_count;
			const curr = this.get_position(t);
			length += curr.minus(prev).norm();
			prev = curr;
		}
		return length;
	}

	update_arc_length_table(sample_count = 1000) {
		let length = 0;
		this.arc_length_table = new Array(sample_count).fill(0);
		if (this.size < 2) {
			return this.arc_length_table
		}
		let prev = this.get_position(0);
		for (let i = 1; i < (sample_count + 1); i++) {
			const t = i / sample_count;
			const curr = this.get_position(t);
			length += curr.minus(prev).norm();
			this.arc_length_table[i] = length
			prev = curr;
		}
		return this.arc_length_table;
	}

	to_string() {
		let str = ""
		str += this.size + "\n"
		for (let i = 0; i < this.size; i++) {
			str += this.points[i].join(' ')
			str += " "
			str += this.tangents[i].join(' ')
			str += "\n"
		}
		return str.trim()
	}
}

export class HumanController {
	constructor() {
		this.human = new Articulated_Human();
		this.cue = new Cue();
		this.moving = false;
		this.spline = null;
		this.t_sim = 0;
		this.end_pos = vec3(0, 0, 0);
		this.end_vel = vec3(0, 0, 1);
		this.timestep = 0.016 / 10;
		this.shapes = {
			'box': new defs.Cube(),
			'ball': new defs.Subdivision_Sphere(4),
			'axis': new defs.Axis_Arrows(),
		};
		const phong = new defs.Phong_Shader();
		this.materials = {};
		this.materials.metal = {
			shader: phong,
			ambient: .8,
			diffusivity: 1,
			specularity: 1,
			color: color(.9, .5, .9, 1)
		}
	}

	start_move(x, y, z, vx, vy, vz) {
		this.end_pos = vec3(x, y, z);
		this.end_vel = vec3(vx, vy, vz)
		this.spline = new HermiteSpline();
		let ef_pos = this.human.get_end_effector_position();
		ef_pos = vec3(0, 1, 6)
		// this.spline.add_point(ef_pos[0], ef_pos[1], ef_pos[2], 0, 0, 0);
		this.spline.add_point(x - vx / 6, y, z - vz / 6, 0, 0, 0);
		this.spline.add_point(x - vx / 3, y, z - vz / 3, 0, 0, 0);
		this.spline.add_point(x, y, z, vx, vy, vz);
		this.t_sim = 0;
		this.moving = true;

		let root_loc = this.human.human_cfg.root_loc;
		let root_angle = Math.atan(vx / vz);
		const vx_hat = vx / Math.sqrt(vx * vx + vz * vz);
		if (vx_hat > 0) {
			root_loc[0] = -vx_hat * 4.5 - 1;
			root_angle = Math.atan(vz / vx);
		} else {
			root_loc[0] = -vx_hat * 1.5 - 1;
		}
		// console.log(vz, vx, root_angle);
		this.human.root.location_matrix = Mat4.translation(...root_loc);
		this.human.root.articulation_matrix = Mat4.rotation(root_angle / 2, 0, 1, 0);
	}

	move(dt, caller, uniforms, animation_time = 1) {
		// console.log("AAA");
		let spline_t = this.t_sim / animation_time;
		if (spline_t > 1) {
			this.t_sim = 0;
			this.moving = false;
			this.spline = null;
			return
		}
		let spline_pos = this.spline.get_position(spline_t);
		this.cue_pos = spline_pos;
		this.cue.set_head_pos(
			this.cue_pos[0], this.cue_pos[1], this.cue_pos[2],
			this.end_vel[0], this.end_vel[1], this.end_vel[2]
		);
		const target_pos = this.cue.get_cue_grab_pos();
		const t_next = this.t_sim + dt
		const end_effector_position = this.human.get_end_effector_position();
		// let chalk_transform3 = Mat4.translation(end_effector_position[0], end_effector_position[1], end_effector_position[2]).times(Mat4.scale(.1, .1, .1));
		// this.shapes.box.draw(caller, uniforms, chalk_transform3, {
		// 	...this.materials.metal,
		// 	color: color(0, 1, 0, 1)
		// });
		// let chalk_transform = Mat4.translation(spline_pos[0], spline_pos[1], spline_pos[2]).times(Mat4.scale(.1, .1, .1));
		// this.shapes.box.draw(caller, uniforms, chalk_transform, {
		// 	...this.materials.metal,
		// 	color: color(1, 0, 0, 1)
		// });
		// let chalk_transform2 = Mat4.translation(target_pos[0], target_pos[1], target_pos[2]).times(Mat4.scale(.1, .1, .1));
		// this.shapes.box.draw(caller, uniforms, chalk_transform2, {
		// 	...this.materials.metal,
		// 	color: color(1, 0, 1, 1)
		// });
		while (this.t_sim < t_next) {
			let norm_t = (this.t_sim - (t_next - dt)) / dt  // [0,1]
			let linear_interpolation = end_effector_position.times(1 - norm_t).plus(target_pos.times(norm_t));
			this.human.move_end_effector(linear_interpolation);
			this.t_sim += this.timestep;
		}
		// console.log(this.human.theta);
	}

	draw(caller, uniforms) {
		this.human.draw(caller, uniforms);
		this.cue.draw(caller, uniforms);
	}

}
