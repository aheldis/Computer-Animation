import {tiny, defs} from './examples/common.js';
import {Ball} from './ball_physics.js';
// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

export class TrajectoryArrow {
	constructor(start) {
		this.shapes = {
			'cylinder': new defs.Capped_Cylinder(1, 16),
			'cone': new defs.Closed_Cone(1, 16)
		};
		this.material = {shader: new defs.Phong_Shader(), ambient: 1.0, color: color(1, 0, 0, 1)}
		this.length = 1.0;
		this.start = start;
		this.angle = 0.0;   // angle around y axis
		this.tip_length = 0.2;
		this.radius = 0.1;
		this.offset = 0.2;
		this.max_angle = Math.PI / 4;
		this.len_range = [0.5, 5.5];
	}

	get_pos_vel() {
		const x = this.start[0];
		const y = this.start[1];
		const z = this.start[2];
		const vz = -this.length * Math.cos(this.angle);
        const vx = -this.length * Math.sin(this.angle);
		const vy = 0;
		return [x, y, z, vx, vy, vz];
	}

	adjust_angle(theta) {
		if ((theta > 0 && this.angle < this.max_angle) || (theta < 0 && this.angle > -this.max_angle)) {
			this.angle += theta;
		}
	}

	adjust_length(l) {
		if ((l > 0 && this.length < this.len_range[1]) || (l < 0 && this.length > this.len_range[0])) {
			this.length += l;
		}
	}

	draw(webgl_manager, uniforms) {
		let cyl_length = this.length;
		let cylinder_transform = Mat4.scale(this.radius, this.radius, this.length);
		cylinder_transform.pre_multiply(Mat4.translation(this.start[0], this.start[1], -this.length / 2 - this.offset));
		cylinder_transform.pre_multiply(Mat4.rotation(this.angle, 0, 1, 0));
		cylinder_transform.pre_multiply(Mat4.translation(0, 0, this.start[2]));

		let cone_transform = Mat4.scale(this.radius * 2, this.radius * 2, this.tip_length);
		cone_transform.pre_multiply(Mat4.rotation(Math.PI, 0, 1, 0));
		cone_transform.pre_multiply(Mat4.translation(0, 0, -this.length - this.offset - this.tip_length));
		cone_transform.pre_multiply(Mat4.rotation(this.angle, 0, 1, 0));
		cone_transform.pre_multiply(Mat4.translation(this.start[0], this.start[1], this.start[2]));

		this.shapes.cylinder.draw(webgl_manager, uniforms, cylinder_transform, this.material);
		this.shapes.cone.draw(webgl_manager, uniforms, cone_transform, this.material);
	}
}