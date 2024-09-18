import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

export const Table =
	class Table {
		constructor(table_dim_x, table_dim_y) {
			const phong = new defs.Phong_Shader();
			const tex_phong = new defs.Textured_Phong();
			this.shapes = {
				'box': new defs.Cube(),
				'ball': new defs.Subdivision_Sphere(4),
				'axis': new defs.Axis_Arrows(),
				// 'line': new Line()
			};
			this.materials = {};
			this.materials.board = {
				shader: phong,
				ambient: 1.0,
				diffusivity: 1,
				specularity: .3,
				color: color(26 / 255, 138 / 255, 95 / 255, 1)
			};
			this.materials.wood = {
				shader: phong,
				ambient: .5,
				diffusivity: .9,
				specularity: .5,
				color: color(151 / 255, 92 / 255, 37 / 255, 1)
			};
			this.materials.hole = {
				shader: phong,
				ambient: .5,
				diffusivity: .9,
				specularity: .5,
				color: color(0, 0, 0, 1)
			};
			this.table_dim_x = table_dim_x;
			this.table_dim_y = table_dim_y;

			this.holes = [
				[this.table_dim_x-0.2, this.table_dim_y-0.2],
				[-(this.table_dim_x-0.2), this.table_dim_y-0.2],
				[this.table_dim_x-0.1, 0],
				[-(this.table_dim_x-0.1), 0],
				[this.table_dim_x-0.2, -(this.table_dim_y-0.2)],
				[-(this.table_dim_x-0.2), -(this.table_dim_y-0.2)]
			]
			this.hole_radius = 0.4

		}

		draw(webgl_manager, uniforms) {
			this.matrix_stack = [];
			let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(this.table_dim_x, 0.01, this.table_dim_y));
			this.shapes.box.draw(webgl_manager, uniforms, floor_transform, this.materials.board);

			for (const hole of this.holes) {
				// let hole = Mat4.translation(this.table_dim_x-0.1, 0, this.table_dim_y-0.1).times(Mat4.scale(this.hole_radius, 0.05, this.hole_radius));
				// this.shapes.ball.draw(webgl_manager, uniforms, hole, this.materials.hole);

				let hole_transform = Mat4.translation(hole[0], 0, hole[1]).times(Mat4.scale(this.hole_radius, 0.05, this.hole_radius));
				this.shapes.ball.draw(webgl_manager, uniforms, hole_transform, this.materials.hole);
			}

			let wall1 = Mat4.translation(-this.table_dim_x - 0.2, 0, 0).times(Mat4.scale(0.2, 0.15, this.table_dim_y + 0.4));
			this.shapes.box.draw(webgl_manager, uniforms, wall1, this.materials.wood);
			let wall2 = Mat4.translation(this.table_dim_x + 0.2, 0, 0).times(Mat4.scale(0.2, 0.15, this.table_dim_y + 0.4));
			this.shapes.box.draw(webgl_manager, uniforms, wall2, this.materials.wood);
			let wall3 = Mat4.translation(0, 0, this.table_dim_y + 0.2).times(Mat4.scale(this.table_dim_x + 0.4, 0.15, 0.2));
			this.shapes.box.draw(webgl_manager, uniforms, wall3, this.materials.wood);
			let wall4 = Mat4.translation(0, 0, -this.table_dim_y - 0.2).times(Mat4.scale(this.table_dim_x + 0.4, 0.15, 0.2));
			this.shapes.box.draw(webgl_manager, uniforms, wall4, this.materials.wood);

			let below = Mat4.translation(0, -0.2, 0).times(Mat4.scale(this.table_dim_x + 0.2, 0.2, this.table_dim_y + 0.2));
			this.shapes.box.draw(webgl_manager, uniforms, below, this.materials.wood);

			let leg1 = Mat4.translation(this.table_dim_x - 1, -1.5, this.table_dim_y - 1).times(Mat4.scale(0.5, 1.5, 0.5));
			this.shapes.box.draw(webgl_manager, uniforms, leg1, this.materials.wood);
			let leg2 = Mat4.translation(-(this.table_dim_x - 1), -1.5, this.table_dim_y - 1).times(Mat4.scale(0.5, 1.5, 0.5));
			this.shapes.box.draw(webgl_manager, uniforms, leg2, this.materials.wood);
			let leg3 = Mat4.translation(this.table_dim_x - 1, -1.5, -(this.table_dim_y - 1)).times(Mat4.scale(0.5, 1.5, 0.5));
			this.shapes.box.draw(webgl_manager, uniforms, leg3, this.materials.wood);
			let leg4 = Mat4.translation(-(this.table_dim_x - 1), -1.5, -(this.table_dim_y - 1)).times(Mat4.scale(0.5, 1.5, 0.5));
			this.shapes.box.draw(webgl_manager, uniforms, leg4, this.materials.wood);

			let connector1 = Mat4.translation(0, -2.5, this.table_dim_y - 1).times(Mat4.scale(this.table_dim_x - 1, 0.3, 0.1));
			this.shapes.box.draw(webgl_manager, uniforms, connector1, this.materials.wood);
			let connector2 = Mat4.translation(0, -2.5, -(this.table_dim_y - 1)).times(Mat4.scale(this.table_dim_x - 1, 0.3, 0.1));
			this.shapes.box.draw(webgl_manager, uniforms, connector2, this.materials.wood);
			let connector3 = Mat4.translation(0, -2.5, 0).times(Mat4.scale(0.3, 0.1, this.table_dim_y - 1));
			this.shapes.box.draw(webgl_manager, uniforms, connector3, this.materials.wood);

		}
	}