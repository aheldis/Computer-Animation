import {tiny, defs} from './examples/common.js';
import { math } from './tiny-graphics-math.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component, Matrix} = tiny;


export class Line extends Shape {
	constructor() {
		super("position", "normal")
		this.material = {shader: new defs.Phong_Shader(), ambient: 1.0, color: color(1, 0, 0, 1)}
		this.arrays.position.push(vec3(0, 0, 0))
		this.arrays.normal.push(vec3(0, 0, 0))
		this.arrays.position.push(vec3(1, 0, 0))
		this.arrays.normal.push(vec3(0, 0, 0))
	}

	draw(webgl_manager, uniforms) {
		super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
	}

	update(webgl_manager, uniforms, x1, x2) {
		this.arrays.position[0] = x1
		this.arrays.position[1] = x2
		this.copy_onto_graphics_card(webgl_manager.context)
	}



}

export class Ball {
	constructor(ball_color, index, is_white=false, radius = 0.2) {
		this.color = ball_color;
		this.position = vec3(0, 0, 0);
		this.velocity = vec3(0, 0, 0);
		this.acceleration = vec3(0, 0, 0);
		this.radius = radius;
		this.rotation_matrix = Mat4.identity();
		this.on_board = true; // true after they fell in the whole
		this.visible = true;
		this.is_white = is_white;
		this.index = index;
	}
}

export class PhysicsEngine {
	constructor(left = -3, right = 3, top = 3, bottom = -3) {
		this.left = left
		this.right = right
		this.top = top
		this.bottom = bottom
		this.friction_coef = 2.0
	}

	apply_friction(balls) {
		for (let i = 0; i < balls.length; i++) {
			balls[i].acceleration = balls[i].velocity.normalized().times(-this.friction_coef)
		}
	}

	update_velocity(balls, dt) {
		for (let i = 0; i < balls.length; i++) {
			balls[i].velocity = balls[i].velocity.plus(balls[i].acceleration.times(dt))
		}
	}

	update_positions(balls, dt) {
		for (let i = 0; i < balls.length; i++) {
			if (balls[i].on_board)
				balls[i].position = balls[i].position.plus(balls[i].velocity.times(dt))
		}
	}

	update_rotation(balls, dt){
		for (let i = 0; i < balls.length; i++) {
			const v = balls[i].velocity
			const rotdirection = vec3(0, 1, 0).cross(v)
			const rotangle = dt * v.norm() / balls[i].radius
			balls[i].rotation_matrix = balls[i].rotation_matrix.pre_multiply(Mat4.rotation(rotangle, rotdirection[0], rotdirection[1], rotdirection[2]))
		}
	}

	collide_balls(balls) {
		for (let i = 0; i < balls.length - 1; i++) {
			for (let j = i + 1; j < balls.length; j++) {
				const d_position = balls[i].position.minus(balls[j].position)
				if (d_position.norm() < (balls[i].radius + balls[j].radius)) {
					const d_velocity = balls[i].velocity.minus(balls[j].velocity)
					if (d_velocity.dot(d_position) > 0) {
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
		for (let i = 0; i < balls.length; i++) {
			if (!balls[i].visible)
				continue;
			if (balls[i].position[0] - balls[i].radius < this.left) {
				balls[i].velocity[0] = Math.abs(balls[i].velocity[0])
			} else if (balls[i].position[0] + balls[i].radius > this.right) {
				balls[i].velocity[0] = -Math.abs(balls[i].velocity[0])
			}
			if (balls[i].position[2] - balls[i].radius < this.bottom) {
				balls[i].velocity[2] = Math.abs(balls[i].velocity[2])
			} else if (balls[i].position[2] + balls[i].radius > this.top) {
				balls[i].velocity[2] = -Math.abs(balls[i].velocity[2])
			}
		}
	}

	hole_collision(balls, table) {
		let dist2;

		for (let i = 0; i < balls.length; i++) {
			if (!balls[i].visible)
				continue;
			for(let j= 0; j < table.holes.length; j++){
				dist2 = (balls[i].position[0] - table.holes[j][0]) ** 2 + (balls[i].position[2] - table.holes[j][1]) ** 2
				if (dist2 < (table.hole_radius ** 2) - 0.05){
					this.hole_collision_callback(balls[i], j)
				}
			}
		}
	}


	hole_collision_callback(ball, holeid){
		if (!ball.is_white) {
			ball.on_board = false;
		} else {
			ball.position = vec3(0, 0, 4);
			ball.velocity = vec3(0, 0, 0.01);
		}
	}

}

class Particle {
	constructor(position, radius) {
		this.position = position;
		this.radius = radius;
	}
}

export class SphericalExplosion {
	constructor(center, radius, num_particles, particle_radius, max_vel) {
		this.center = center;
		this.radius = radius;
		this.particles = [];
		this.particle_radius = particle_radius;
		this.max_vel = max_vel;
		this.max_dist = 2 * this.radius;
		this.done = false;	// if explosion has completed
		this.ball = -1;

		this.num_particles = this.init_particles(num_particles, particle_radius);
		// console.log(this.num_particles + " particles created from the requested " + num_particles);
	}

	init_particles(num_particles, particle_radius) {
		// Even spherical spacing alg from
		// https://www.cmu.edu/biolphys/deserno/pdf/sphere_equi.pdf
		let n_count = 0;
		const a = 4 * Math.PI * Math.pow(this.radius, 2) / num_particles;
		const d = Math.sqrt(a);
		const M_theta = Math.round(Math.PI / d);
		const d_theta = Math.PI / M_theta;
		const d_phi = a / d_theta;
		for (let m = 0; m < M_theta; m++) {
			let theta = Math.PI * (m + 0.5) / M_theta;
			let M_phi = Math.round(2 * Math.PI * Math.sin(theta) / d_phi);
			for (let n = 0; n < M_phi; n++) {
				let phi = 2 * Math.PI * n / M_phi;
				let pos = vec3(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta));
				pos.scale_by(this.radius);
				this.particles.push(new Particle(pos.to4(true), particle_radius));
				n_count++;
			}
		}
		return n_count;
	}

	get_velocity(pos) {
		let dist = pos.minus(vec4(0, 0, 0, 1));
		if (dist >= this.max_dist) {
			return vec4(0, 0, 0, 0);
		}
		let period = 2 * this.max_dist;
		let speed = this.max_vel * Math.sin((dist.norm() * 2 * Math.PI / period) + (0.5 * period));
		return dist.times(speed);
	}

	update_position(dt) {
		let threshold = 0.0001;
		for (let p of this.particles) {
			let v = this.get_velocity(p.position);
			if (v.norm() < threshold) {
				this.done = true;
			}
			else {
				// reduce size as explosion occurs
				p.position = p.position.plus(v.times(dt));
				let a = 1 - (p.position.norm() / this.max_dist);
				p.radius = a * this.particle_radius;
			}
		}
	}
}


export class BallPhong extends Shader {
	// This is a Shader using Phong_Shader as template
	// TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

	constructor(num_lights = 2) {
		super();
		this.num_lights = num_lights;
	}

	shared_glsl_code() {
		// ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
		return ` 
        precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace, position_objectspace;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );    
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `;
	}

	vertex_glsl_code() {
		// ********* VERTEX SHADER *********
		return this.shared_glsl_code() + `
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                   
            	position_objectspace = position;                                                
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                
            } `;
	}

	fragment_glsl_code() {
		// ********* FRAGMENT SHADER *********
		// A fragment is a pixel that's overlapped by the current triangle.
		// Fragments affect the final image or get discarded due to depth.
		return this.shared_glsl_code() + `
            void main(){                                                           
                // Compute an initial (ambient) color:
                vec3 shapecolor = shape_color.xyz;
                if(position_objectspace.y > 0.7 || position_objectspace.y < -0.7){
                    shapecolor = vec3(1.0, 1.0, 1.0);
                }
                
                gl_FragColor = vec4( shapecolor * ambient, shape_color.w );
                // Compute the final color with contributions from lights:
                gl_FragColor.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
            } `;
	}

	send_material(gl, gpu, material) {
		// send_material(): Send the desired shape-wide material qualities to the
		// graphics card, where they will tweak the Phong lighting formula.
		gl.uniform4fv(gpu.shape_color, material.color);
		gl.uniform1f(gpu.ambient, material.ambient);
		gl.uniform1f(gpu.diffusivity, material.diffusivity);
		gl.uniform1f(gpu.specularity, material.specularity);
		gl.uniform1f(gpu.smoothness, material.smoothness);
	}

	send_gpu_state(gl, gpu, gpu_state, model_transform) {
		// send_gpu_state():  Send the state of our whole drawing context to the GPU.
		const O = vec4(0, 0, 0, 1), camera_center = gpu_state.camera_transform.times(O).to3();
		gl.uniform3fv(gpu.camera_center, camera_center);
		// Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
		const squared_scale = model_transform.reduce(
			(acc, r) => {
				return acc.plus(vec4(...r).times_pairwise(r))
			}, vec4(0, 0, 0, 0)).to3();
		gl.uniform3fv(gpu.squared_scale, squared_scale);
		// Send the current matrices to the shader.  Go ahead and pre-compute
		// the products we'll need of the of the three special matrices and just
		// cache and send those.  They will be the same throughout this draw
		// call, and thus across each instance of the vertex shader.
		// Transpose them since the GPU expects matrices as column-major arrays.
		const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
		gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
		gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

		// Omitting lights will show only the material color, scaled by the ambient term:
		if (!gpu_state.lights.length)
			return;

		const light_positions_flattened = [], light_colors_flattened = [];
		for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
			light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
			light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
		}
		gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
		gl.uniform4fv(gpu.light_colors, light_colors_flattened);
		gl.uniform1fv(gpu.light_attenuation_factors, gpu_state.lights.map(l => l.attenuation));
	}

	update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
		// update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
		// recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
		// to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
		// program (which we call the "Program_State").  Send both a material and a program state to the shaders
		// within this function, one data field at a time, to fully initialize the shader for a draw.

		// Fill in any missing fields in the Material object with custom defaults for this shader:
		const defaults = {color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40};
		material = Object.assign({}, defaults, material);

		this.send_material(context, gpu_addresses, material);
		this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
	}
}







