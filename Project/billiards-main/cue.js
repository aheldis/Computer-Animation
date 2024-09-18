import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix} = tiny;

export class Cue {
	constructor() {
		this.pos_start = vec3(0, 0, 0);
		this.pos_end = vec3(0, 0, 0);
		this.length = 4.5;
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
		this.shapes = {
			'sphere': new defs.Subdivision_Sphere(5),
			'Rounded_Capped_Cylinder': new defs.Rounded_Capped_Cylinder(30, 30),
			'box': new defs.Cube(),
		};
		this.set_head_pos(0.6, 1.5, 7, 0, 1, 0);
	}

	set_head_pos(x, y, z, vx, vy, vz) {
		// console.log(x, y, z, vx, vy, vz)

		let v_size = vec3(vx, vy, vz).norm();
		let p1 = (vec3(x, y, z).minus(vec3(vx, vy, vz).times(this.length/v_size)));
		let p2 = vec3(x, y, z);
		this.pos_start = p1;
		this.pos_end = p2;
		this.grab_pos = (vec3(x, y, z).minus(vec3(vx, vy, vz).times(this.length/v_size*.9)));
		// console.log(p1, p2)
		const len = (p2.minus(p1)).norm();
		const center = (p1.plus(p2)).times(0.5);

		let model_transform = Mat4.scale(0.05, len / 2, 0.05);

		const p = p1.minus(p2).normalized();
		let v = vec3(0, 1, 0);
		if (Math.abs(v.cross(p).norm()) < 0.1) {
			v = vec3(0, 0, 1);
			model_transform = Mat4.scale(0.05, 0.05, len / 2);
		}
		const w = v.cross(p).normalized();

		const theta = Math.acos(v.dot(p));
		model_transform.pre_multiply(Mat4.rotation(theta, w[0], w[1], w[2]));
		model_transform.pre_multiply(Mat4.translation(center[0], center[1], center[2]));
		this.cue_transform = model_transform;

		// if (v_size > 0) {
		// 	this.rot[1] = Math.atan(vz / vx) * Math.sign(vx) * -1;
		// 	// this.rot[2] = Math.atan()
		// }
		// this.eye = vec3(x-vx/v_size*this.length/2, y-vy/v_size*this.length/2, z-vz/v_size*this.length/2);
		// this.eye = vec3(0, 0, 0);
		// this.pos = vec3(x, y, x);
	}

	get_cue_grab_pos() {
		return this.grab_pos;
	}

	draw(caller, uniforms) {
		// this.cue_transform = Mat4.scale(.05, .05, this.length);
		// this.cue_transform = Mat4.translation(0, 0, this.length / 2).times(this.cue_transform);
		// this.cue_transform = Mat4.rotation(1.5708, 0, 1, 0).times(this.cue_transform);
		// this.cue_transform = Mat4.look_at(this.eye, this.pos, vec3(0, 1, 0)).times(this.cue_transform);
		// this.cue_transform = Mat4.rotation(1.5708, 0, 1, 0).times(this.cue_transform);

		// this.cue_transform = Mat4.rotation(this.rot[0], 1, 0, 0).times(this.cue_transform);
		// this.cue_transform = Mat4.rotation(this.rot[2], 0, 0, 1).times(this.cue_transform);
		// this.cue_transform = Mat4.rotation(this.rot[1], 0, 1, 0).times(this.cue_transform);

		// this.cue_transform = Mat4.translation(this.pos[0], this.pos[1], this.pos[2]).times(this.cue_transform);

		this.shapes.box.draw(caller, uniforms, this.cue_transform, this.materials.cue_wood);
	}
}