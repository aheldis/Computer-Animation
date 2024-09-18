import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

// TODO: you should implement the required classes here or in another file.
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

    set_tangent(idx, tx, ty, tz) {
        this.tangents[idx] = vec3(tx, ty, tz);
    }

    set_point(idx, tx, ty, tz) {
        this.points[idx] = vec3(tx, ty, tz);
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

    _get_arc_length() {
        // let sp = new Spline()
        // sp.add_point(0.0, 5.0, 0.0, -20.0, 0.0, 20.0)
        // sp.add_point(0.0, 5.0, 5.0, 20.0, 0.0, 20.0)
        // sp.add_point(5.0, 5.0, 5.0, 20.0, 0.0, -20.0)
        // sp.add_point(5.0, 5.0, 0.0, -20.0, 0.0, -20.0)
        // sp.add_point(0.0, 5.0, 0.0, -20.0, 0.0, 20.0)

        let length = 0;
        let sample_cnt = 1000;

        let prev = this.get_position(0);

        for (let i = 1; i < (sample_cnt + 1); i++) {
            const t = i / sample_cnt;
            const curr = this.get_position(t);
            length += curr.minus(prev).norm();
            prev = curr;
        }
        return length;
    }
}

class Curve_Shape extends Shape {
    constructor(curve_function, sample_count, curve_color=color(1, 0, 0, 1)) {
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

export const Part_one_hermite_base = defs.Part_one_hermite_base =
    class Part_one_hermite_base extends Component {                                          // **My_Demo_Base** is a Scene that can be added to any display canvas.
        // This particular scene is broken up into two pieces for easier understanding.
        // The piece here is the base class, which sets up the machinery to draw a simple
        // scene demonstrating a few concepts.  A subclass of it, Part_one_hermite,
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
            this.spline = new Spline();
            this.sample_cnt = 1000;

            this.curve = new Curve_Shape(null, 100)
        }

        render_animation(caller) {                                                // display():  Called once per frame of animation.  We'll isolate out
            // the code that actually draws things into Part_one_hermite, a
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
                Shader.assign_camera(Mat4.look_at(vec3(10, 10, 10), vec3(0, 0, 0), vec3(0, 1, 0)), this.uniforms);
            }
            this.uniforms.projection_transform = Mat4.perspective(Math.PI / 4, caller.width / caller.height, 1, 100);

            // *** Lights: *** Values of vector or point lights.  They'll be consulted by
            // the shader when coloring shapes.  See Light's class definition for inputs.
            const t = this.t = this.uniforms.animation_time / 1000;
            const angle = Math.sin(t);

            // const light_position = Mat4.rotation( angle,   1,0,0 ).times( vec4( 0,-1,1,0 ) ); !!!
            // !!! Light changed here
            const light_position = vec4(20 * Math.cos(angle), 20, 20 * Math.sin(angle), 1.0);
            this.uniforms.lights = [defs.Phong_Shader.light_source(light_position, color(1, 1, 1, 1), 1000000)];

            // draw axis arrows.
            this.shapes.axis.draw(caller, this.uniforms, Mat4.identity(), this.materials.rgb);
        }
    }


export class Part_one_hermite extends Part_one_hermite_base {                                                    // **Part_one_hermite** is a Scene object that can be added to any display canvas.
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

        const blue = color(0, 0, 1, 1), yellow = color(1, 0.7, 0, 1), red = color(1, 0, 0, 1);

        const t = this.t = this.uniforms.animation_time / 1000;

        // !!! Draw ground
        let floor_transform = Mat4.translation(0, 0, 0).times(Mat4.scale(10, 0.01, 10));
        this.shapes.box.draw(caller, this.uniforms, floor_transform, {...this.materials.plastic, color: yellow});

        // !!! Draw ball (for reference)
        let ball_transform = Mat4.translation(this.ball_location[0], this.ball_location[1], this.ball_location[2])
            .times(Mat4.scale(this.ball_radius, this.ball_radius, this.ball_radius));
        this.shapes.ball.draw(caller, this.uniforms, ball_transform, {...this.materials.metal, color: blue});

        // TODO: you should draw spline here.
        const points = this.spline.points;
        for (let i = 0; i < points.length; i++) {
            let ball_transform = Mat4.translation(points[i][0], points[i][1], points[i][2])
                .times(Mat4.scale(0.05, 0.05, 0.05));
            this.shapes.ball.draw(caller, this.uniforms, ball_transform, {...this.materials.metal, color: color(0, 1, 0, 1)});
        }
        this.curve.draw(caller, this.uniforms);
    }

    render_controls() {                                 // render_controls(): Sets up a panel of interactive HTML elements, including
        // buttons with key bindings for affecting this scene, and live info readouts.
        this.control_panel.innerHTML += "Part One:";
        this.new_line();
        this.key_triggered_button("Parse Commands", [], this.parse_commands);
        this.new_line();
        this.key_triggered_button("Draw", [], this.update_scene);
        this.new_line();
        this.key_triggered_button("Load", [], this.load_spline);
        this.new_line();
        this.key_triggered_button("Export", [], this.export_spline);
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
            lines[i] = lines[i].replace(',', '');
            const words = lines[i].split(' ');
            if (lines[i].startsWith('add point') && words.length === 8) {
                const x = parseFloat(words[2]);
                const y = parseFloat(words[3]);
                const z = parseFloat(words[4]);
                const tx = parseFloat(words[5]);
                const ty = parseFloat(words[6]);
                const tz = parseFloat(words[7]);
                this.spline.add_point(x, y, z, tx, ty, tz);
                const curve_fn = (t) => this.spline.get_position(t);
                this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
            } else if (lines[i].startsWith('set tangent') && words.length === 6) {
                const index = parseInt(words[2]);
                const tx = parseFloat(words[3]);
                const ty = parseFloat(words[4]);
                const tz = parseFloat(words[5]);
                this.spline.set_tangent(index, tx, ty, tz);
                this.curve.update(caller, this.uniforms);
            } else if (lines[i].startsWith('set point') && words.length === 6) {
                const index = parseInt(words[2]);
                const x = parseFloat(words[3]);
                const y = parseFloat(words[4]);
                const z = parseFloat(words[5]);
                this.spline.set_point(index, x, y, z);
                this.curve.update(caller, this.uniforms);
            } else if (lines[i].startsWith('get_arc_length')) {
                document.getElementById("output").value = this.spline._get_arc_length();
            } else if (lines[i].length > 0) {
                document.getElementById("output").value = "invalid input";
            }
        }
    }

    update_scene() { // callback for Draw button
        document.getElementById("output").value = "update_scene";
        const curve_fn = (t) => this.spline.get_position(t);
        this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
    }

    load_spline() {
        document.getElementById("output").value = "load_spline";
        let text = document.getElementById("input").value;
        const lines = text.split('\n');
        let n = parseInt(lines[0])
        for (let i = 1; i < n + 1; i++) {
            const words = lines[i].split(' ');
            if (words.length === 6) {
                const x = parseFloat(words[0]);
                const y = parseFloat(words[1]);
                const z = parseFloat(words[2]);
                const tx = parseFloat(words[3]);
                const ty = parseFloat(words[4]);
                const tz = parseFloat(words[5]);
                this.spline.add_point(x, y, z, tx, ty, tz);
                const curve_fn = (t) => this.spline.get_position(t);
                this.curve = new Curve_Shape(curve_fn, this.sample_cnt);
            } else if (lines[i].length > 0) {
                document.getElementById("output").value = "invalid input";
            }
        }
    }

    export_spline() {
        let str = this.spline.size.toString();
        for (let i = 0; i < this.spline.size; i++) {
            str = str.concat("\n");
            str = str.concat(this.spline.points[i][0].toString());
            str = str.concat(" ");
            str = str.concat(this.spline.points[i][1].toString());
            str = str.concat(" ");
            str = str.concat(this.spline.points[i][2].toString());
            str = str.concat(" ");
            str = str.concat(this.spline.tangents[i][0].toString());
            str = str.concat(" ");
            str = str.concat(this.spline.tangents[i][1].toString());
            str = str.concat(" ");
            str = str.concat(this.spline.tangents[i][2].toString());
        }
        document.getElementById("output").value = str;
    }
}

