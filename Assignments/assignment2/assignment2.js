import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

// TODO: you should implement the required classes here or in another file.

import {Articulated_Human} from "./human.js";

class Spline {
    constructor() {
        this.points = [];
        this.tangents = [];
        this.size = 0;
    }

    add_point(x, y, z, tx, ty, tz) {
        this.points.push(vec3(x, y, z));
        this.tangents.push(vec3(tx, ty, tz));
        this.size += 1;
    }

    get_position(t) {
        if (this.size < 2) {
            return vec3(0, 0, 0);
        }

        const A = Math.floor(t * (this.size - 1));
        const B = Math.ceil(t * (this.size - 1));
        const s = (t * (this.size - 1)) % 1.0;
        //
        // let a = this.points[A].copy();
        // let b = this.points[B].copy();
        // return a.times(this.h0(s)).plus(b.times(this.h1(s)));
        let p0 = this.points[A].copy();
        let p1 = this.points[B].copy();
        let m0 = this.tangents[A].copy();
        let m1 = this.tangents[B].copy();
        return p0.times(2 * Math.pow(s, 3) - 3 * Math.pow(s, 2) + 1).plus(
            m0.times(Math.pow(s, 3) - 2 * Math.pow(s, 2) + s).plus(
                p1.times(-2 * Math.pow(s, 3) + 3 * Math.pow(s, 2)).plus(
                    m1.times(Math.pow(s, 3) - Math.pow(s, 2)))));

    }
}

class Curve_Shape extends Shape {
    constructor(curve_function, sample_count, curve_color = color(1, 1, 1, 1)) {
        super("position", "normal");
        this.material = {shader: new defs.Phong_Shader(), ambient: 1.0, color: curve_color}
        this.sample_count = sample_count;

        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = i / this.sample_count;
                this.arrays.position.push(curve_function(t));
                this.arrays.normal.push(vec3(0, 0, 0));
            }
        }
    }

    draw(webgl_manager, uniforms) {
        super.draw(webgl_manager, uniforms, Mat4.identity(), this.material, "LINE_STRIP");
    }

    update(webgl_manager, uniforms, curve_function) {
        if (curve_function && this.sample_count) {
            for (let i = 0; i < this.sample_count + 1; i++) {
                let t = 1.0 * i / this.sample_count;
                this.arrays.position[i] = curve_function(t);
            }
        }
        this.copy_onto_graphics_card(webgl_manager.context);
    }
}

export const Assignment2_base = defs.Assignment2_base =
    class Assignment2_base extends Component {
        // **My_Demo_Base** is a Scene that can be added to any display canvas.
        // This particular scene is broken up into two pieces for easier understanding.
        // The piece here is the base class, which sets up the machinery to draw a simple
        // scene demonstrating a few concepts.  A subclass of it, Assignment2,
        // exposes only the display() method, which actually places and draws the shapes,
        // isolating that code so it can be experimented with on its own.
        init() {
            console.log("init")

            // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
            this.hover = this.swarm = false;
            // At the beginning of our program, load one of each of these shape
            // definitions onto the GPU.  NOTE:  Only do this ONCE per shape it
            // would be redundant to tell it again.  You should just re-use the
            // one called "box" more than once in display() to draw multiple cubes.
            // Don't define more than one blueprint for the same thing here.
            this.shapes = {
                'box': new defs.Cube(),
                'ball': new defs.Subdivision_Sphere(4),
                'axis': new defs.Axis_Arrows()
            };

            // *** Materials: ***  A "material" used on individual shapes specifies all fields
            // that a Shader queries to light/color it properly.  Here we use a Phong shader.
            // We can now tweak the scalar coefficients from the Phong lighting formulas.
            // Expected values can be found listed in Phong_Shader::update_GPU().
            const basic = new defs.Basic_Shader();
            const phong = new defs.Phong_Shader();
            const tex_phong = new defs.Textured_Phong();
            this.materials = {};
            this.materials.plastic = {
                shader: phong,
                ambient: .2,
                diffusivity: 1,
                specularity: .5,
                color: color(.9, .5, .9, 1)
            }
            this.materials.metal = {
                shader: phong,
                ambient: .2,
                diffusivity: 1,
                specularity: 1,
                color: color(.9, .5, .9, 1)
            }
            this.materials.rgb = {shader: tex_phong, ambient: .5, texture: new Texture("assets/rgb.jpg")}

            this.ball_location = vec3(1, 1, 1);
            this.ball_radius = 0.25;

            // TODO: you should create a Spline class instance
            this.human = new Articulated_Human();

            this.spline = new Spline();
            this.spline.add_point(2.75, 6.0, -0.9, 0.2, 0.2, 0.0);
            this.spline.add_point(3.25, 6.5, -0.9, 0.7, 0.0, 0.0);
            this.spline.add_point(3.75, 6.0, -0.9, 0.0, -1.0, 0.0);
            this.spline.add_point(3.25, 5.5, -0.9, -0.7, 0.0, 0.0);
            this.spline.add_point(2.75, 6.0, -0.9, -0.2, 0.2, 0.0);
            this.spline.add_point(2.25, 6.5, -0.9, -0.7, 0.0, 0.0);
            this.spline.add_point(1.75, 6.0, -0.9, 0.0, -1.0, 0.0);
            this.spline.add_point(2.25, 5.5, -0.9, 0.7, 0.0, 0.0);
            this.spline.add_point(2.75, 6.0, -0.9, 0.2, 0.2, 0.0);

            this.sample_cnt = 1000;
            this.curve_fn = (t) => this.spline.get_position(t);
            this.curve = new Curve_Shape(this.curve_fn, this.sample_cnt);
            this.step = 0;

        }

        render_animation(caller) {                                                // display():  Called once per frame of animation.  We'll isolate out
            // the code that actually draws things into Assignment2, a
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
                // TODO: you can change the camera as needed.
                Shader.assign_camera(Mat4.look_at(vec3(5, 8, 15), vec3(0, 5, 0), vec3(0, 1, 0)), this.uniforms);
            }
            this.uniforms.projection_transform = Mat4.perspective(Math.PI / 4, caller.width / caller.height, 1, 100);

            // *** Lights: *** Values of vector or point lights.  They'll be consulted by
            // the shader when coloring shapes.  See Light's class definition for inputs.
            const t = this.t = this.uniforms.animation_time / 1000;

            // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
            // !!! Light changed here
            const light_position = vec4(20, 20, 20, 1.0);
            this.uniforms.lights = [defs.Phong_Shader.light_source(light_position, color(1, 1, 1, 1), 1000000)];

            // draw axis arrows.
            this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
        }
    }


export class Assignment2 extends Assignment2_base {
    // **Assignment2** is a Scene object that can be added to any display canvas.
    // This particular scene is broken up into two pieces for easier understanding.
    // See the other piece, My_Demo_Base, if you need to see the setup code.
    // The piece here exposes only the display() method, which actually places and draws
    // the shapes.  We isolate that code so it can be experimented with on its own.
    // This gives you a very small code sandbox for editing a simple scene, and for
    // experimenting with matrix transformations.
    render_animation(caller) {                                                // display():  Called once per frame of animation.  For each shape that you want to
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
        super.render_animation(caller);

        /**********************************
         Start coding down here!!!!
         **********************************/
            // From here on down it's just some example shapes drawn for you -- freely
            // replace them with your own!  Notice the usage of the Mat4 functions
            // translation(), scale(), and rotation() to generate matrices, and the
            // function times(), which generates products of matrices.

        const blue = color(0, 0, 1, 1), yellow = color(1, 0.7, 0, 1),
            wall_color = color(0.7, 1.0, 0.8, 1),
            blackboard_color = color(0.2, 0.2, 0.2, 1);

        const t = this.t = this.uniforms.animation_time / 1000;

        // !!! Draw ground
        let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
        this.shapes.box.draw(caller, this.uniforms, floor_transform, {...this.materials.plastic, color: yellow});

        // TODO: you should draw scene here.
        const points = this.spline.points;
        for (let i = 0; i < points.length; i++) {
            let ball_transform = Mat4.translation(points[i][0], points[i][1], points[i][2])
                .times(Mat4.scale(0.02, 0.02, 0.02));
            this.shapes.ball.draw(caller, this.uniforms, ball_transform, {
                ...this.materials.metal,
                color: color(1, 1, 1, 1)
            });
        }
        this.curve.draw(caller, this.uniforms);

        // TODO: you can change the wall and board as needed.
        let wall_transform = Mat4.translation(0, 5, -1.2).times(Mat4.scale(10, 5, 0.1));
        this.shapes.box.draw(caller, this.uniforms, wall_transform, {...this.materials.plastic, color: wall_color});
        let board_transform = Mat4.translation(3, 6, -1).times(Mat4.scale(2.5, 2.5, 0.1));
        this.shapes.box.draw(caller, this.uniforms, board_transform, {
            ...this.materials.plastic,
            color: blackboard_color
        });
        this.human.draw(caller, this.uniforms, this.materials.plastic);

        for (let i = 0; i < this.sample_count + 1; i++) {
            let t = 1.0 * i / this.sample_count;
            this.arrays.position[i] = curve_function(t);
        }


        let k = 0.03;

        let p = this.human.get_end_effector_position();
        let pg = this.curve_fn(this.step / this.sample_cnt);
        this.step = (this.step + 1.0) % this.sample_cnt;
        let E = pg.minus(p);
        let delta_x = E.times(k);
        let J = this.human.calculate_Jacobian();
        let delta_theta = this.human.calculate_delta_theta(J, delta_x);
        for (let i = 0; i < 7; i++)
            this.human.theta[i] = this.human.theta[i] + delta_theta[i][0];
        this.human.apply_theta();
        console.log(delta_theta);
        p = this.human.get_end_effector_position();
        if (pg.minus(p).norm() > E.norm()) {
            for (let i = 0; i < 7; i++)
                this.human.theta[i] = this.human.theta[i] - delta_theta[i][0] + (Math.random() - 0.5) * 2e-3;
            this.human.apply_theta();
        }
    }


    render_controls() {
        // render_controls(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Assignment 2: IK Engine";
        this.new_line();
        // TODO: You can add your button events for debugging. (optional)
        this.key_triggered_button("Debug", ["Shift", "D"], this.debug);
        this.new_line();
    }

    debug() {
        this.human.debug();
        console.log("Current end effector at ", this.human.get_end_effector_position());
    }


}
