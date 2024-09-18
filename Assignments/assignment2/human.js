import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

const shapes = {
    'sphere': new defs.Subdivision_Sphere( 5 ),
};

export
const Articulated_Human = 
class Articulated_Human {
    constructor() {
        const sphere_shape = shapes.sphere;

        // torso node
        const torso_transform = Mat4.scale(1, 1.1, 0.5);
        this.torso_node = new Node("torso", sphere_shape, torso_transform);
        // root->torso
        const root_location = Mat4.translation(-2, 5, 0);
        this.root = new Arc("root", null, this.torso_node, root_location);
        this.root.set_dof(true, true, true);

        // head node
        let head_transform = Mat4.scale(.6, .6, .6);
        head_transform.pre_multiply(Mat4.translation(0, .6, 0));
        this.head_node = new Node("head", sphere_shape, head_transform);
        const neck_location = Mat4.translation(0, 1.1, 0);
        this.neck = new Arc("neck", this.torso_node, this.head_node, neck_location);
        this.torso_node.children_arcs.push(this.neck);

        // right upper arm node
        let ru_arm_transform = Mat4.scale(1.2, .2, .2);
        ru_arm_transform.pre_multiply(Mat4.translation(1.2, 0, 0));
        this.ru_arm_node = new Node("ru_arm", sphere_shape, ru_arm_transform);
        const r_shoulder_location = Mat4.translation(0.6, .9, 0);
        this.r_shoulder = new Arc("r_shoulder", this.torso_node, this.ru_arm_node, r_shoulder_location);
        this.torso_node.children_arcs.push(this.r_shoulder)
        this.r_shoulder.set_dof(true, true, true);

        // right lower arm node
        let rl_arm_transform = Mat4.scale(1, .2, .2);
        rl_arm_transform.pre_multiply(Mat4.translation(1, 0, 0));
        this.rl_arm_node = new Node("rl_arm", sphere_shape, rl_arm_transform);
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
        this.rl_arm_node.children_arcs.push(this.r_wrist)
        this.r_wrist.set_dof(true, false, true);


        // end effector wrist
        const r_hand_end_local_pos = vec4(0.8, 0, 0, 1);
        this.end_effector = new End_Effector("right_hand", this.r_wrist, r_hand_end_local_pos);
        this.r_wrist.end_effector = this.end_effector;

        // this.dof = 10;
        this.dof = 7;
        this.Jacobian = null;
        this.position = [0, 0, 0];
        this.theta = [0, 0, 0, 0, 0, 0, 0];
        this.apply_position();
        this.apply_theta();

        // left upper arm node
        let lu_arm_transform = Mat4.scale(1, .2, .2);
        lu_arm_transform.pre_multiply(Mat4.translation(-1.2, 0, 0));
        this.lu_arm_node = new Node("lu_arm", sphere_shape, lu_arm_transform);
        // torso->r_shoulder->ru_arm
        const l_shoulder_location = Mat4.translation(-0.4, .9, 0);
        this.l_shoulder = new Arc("l_shoulder", this.torso_node, this.lu_arm_node, l_shoulder_location);
        this.torso_node.children_arcs.push(this.l_shoulder)

        // left lower arm node
        let ll_arm_transform = Mat4.scale(1, .2, .2);
        ll_arm_transform.pre_multiply(Mat4.translation(-1, 0, 0));
        this.ll_arm_node = new Node("ll_arm", sphere_shape, ll_arm_transform);
        const l_elbow_location = Mat4.translation(-2.2, 0, 0);
        this.l_elbow = new Arc("l_elbow", this.lu_arm_node, this.ll_arm_node, l_elbow_location);
        this.lu_arm_node.children_arcs.push(this.l_elbow)

        // left hand node
        let l_hand_transform = Mat4.scale(.4, .3, .2);
        l_hand_transform.pre_multiply(Mat4.translation(-0.4, 0, 0));
        this.l_hand_node = new Node("l_hand", sphere_shape, l_hand_transform);
        const l_wrist_location = Mat4.translation(-2, 0, 0);
        this.l_wrist = new Arc("l_wrist", this.ll_arm_node, this.l_hand_node, l_wrist_location);
        this.ll_arm_node.children_arcs.push(this.l_wrist)

        // right upper leg node
        let ru_leg_transform = Mat4.scale(.2, 1, .2);
        ru_leg_transform.pre_multiply(Mat4.translation(.2, -2, 0));
        this.ru_leg_node = new Node("ru_leg", sphere_shape, ru_leg_transform);
        const r_pelvis_location = Mat4.translation(.2, 0, 0);
        this.r_pelvis = new Arc("r_pelvis", this.torso_node, this.ru_leg_node, r_pelvis_location);
        this.torso_node.children_arcs.push(this.r_pelvis)

        // right lower leg node
        let rl_leg_transform = Mat4.scale(.2, 1, .2);
        rl_leg_transform.pre_multiply(Mat4.translation(0, -4, 0));
        this.rl_leg_node = new Node("rl_leg", sphere_shape, rl_leg_transform);
        const r_knee_location = Mat4.translation(.2, 0, 0);
        this.r_knee = new Arc("r_knee", this.ru_leg_node, this.rl_leg_node, r_knee_location);
        this.ru_leg_node.children_arcs.push(this.r_knee)

        // right palm node
        let r_foot_transform = Mat4.scale(.3, .2, .2);
        r_foot_transform.pre_multiply(Mat4.translation(0, -.4, 0));
        this.r_foot_node = new Node("l_palm", sphere_shape, r_foot_transform);
        const r_palm_location = Mat4.translation(0, -4.5, 0);
        this.r_palm = new Arc("l_wrist", this.rl_leg_node, this.r_foot_node, r_palm_location);
        this.rl_leg_node.children_arcs.push(this.r_palm)


        // left upper leg node
        let lu_leg_transform = Mat4.scale(.2, 1, .2);
        lu_leg_transform.pre_multiply(Mat4.translation(-.2, -2, 0));
        this.lu_leg_node = new Node("lu_leg", sphere_shape, lu_leg_transform);
        const l_pelvis_location = Mat4.translation(-.2, 0, 0);
        this.l_pelvis = new Arc("l_pelvis", this.torso_node, this.lu_leg_node, l_pelvis_location);
        this.torso_node.children_arcs.push(this.l_pelvis)

        // left lower leg node
        let ll_leg_transform = Mat4.scale(.2, 1, .2);
        ll_leg_transform.pre_multiply(Mat4.translation(0, -4, 0));
        this.ll_leg_node = new Node("ll_leg", sphere_shape, ll_leg_transform);
        const l_knee_location = Mat4.translation(-.2, 0, 0);
        this.l_knee = new Arc("l_knee", this.lu_leg_node, this.ll_leg_node, l_knee_location);
        this.lu_leg_node.children_arcs.push(this.l_knee)

        // left palm node
        let l_foot_transform = Mat4.scale(.3, .2, .2);
        l_foot_transform.pre_multiply(Mat4.translation(0, -.4, 0));
        this.l_foot_node = new Node("l_palm", sphere_shape, l_foot_transform);
        const l_palm_location = Mat4.translation(0, -4.5, 0);
        this.l_palm = new Arc("l_wrist", this.ll_leg_node, this.l_foot_node, l_palm_location);
        this.ll_leg_node.children_arcs.push(this.l_palm)
    }

    apply_position() {
        this.root.update_pos(this.position)
    }

    apply_theta() {
        this.r_shoulder.update_articulation(this.theta.slice(0, 3));
        this.r_elbow.update_articulation(this.theta.slice(3, 5));
        this.r_wrist.update_articulation(this.theta.slice(5, 7));
    }

    calculate_Jacobian() {
        let J = new Array(3);
        for (let i = 0; i < 3; i++) {
            J[i] = new Array(this.dof);
        }

        // TODO: Implement your Jacobian here

        let first_pos = this.get_end_effector_position();
        for (let i = 0; i < 7; i++) {
            this.theta[i] = this.theta[i] + 1e-7;
            this.apply_theta();
            let second_pos = this.get_end_effector_position();
            let dp = second_pos.minus(first_pos);
            J[0][i] = dp[0]/1e-7;
            J[1][i] = dp[1]/1e-7;
            J[2][i] = dp[2]/1e-7;
            this.theta[i] = this.theta[i] - 1e-7;
            this.apply_theta();
        }

        // for (let i = 0; i < 3; i++) {
        //     this.position[i] = this.position[i] + 1e-7;
        //     this.apply_position();
        //     let second_pos = this.get_end_effector_position();
        //     let dp = second_pos.minus(first_pos);
        //     J[0][7 + i] = dp[0] / 1e-7;
        //     J[1][7 + i] = dp[1] / 1e-7;
        //     J[2][7 + i] = dp[2] / 1e-7;
        //     this.position[i] = this.position[i] - 1e-7;
        //     this.apply_position();
        // }
        return J; // 3x10 in my case.
    }

    calculate_delta_theta(J, delta_x) {
        let dx = new Array(3);
        dx[0] = delta_x[0]; dx[1] = delta_x[1]; dx[2] = delta_x[2];
        try {
            const A = math.multiply(math.transpose(J), J);
            // console.log("A", A);
            const b = math.multiply(math.transpose(J), dx);
            // console.log("b", b);
            const x = math.lusolve(A, b);
            return x;
        } catch {
            console.log("singular");
            let x = new Array(7);
            for (let i = 0; i < 7; i++)
                x[i] = (Math.random() - 0.5) * 2e-3;
            return x;
        }
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


    draw(webgl_manager, uniforms, material) {
        this.matrix_stack = [];
        this._rec_draw(this.root, Mat4.identity(), webgl_manager, uniforms, material);
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
            node.shape.draw(webgl_manager, uniforms, matrix, material);

            matrix = this.matrix_stack.pop();
            for (const next_arc of node.children_arcs) {
                this.matrix_stack.push(matrix.copy());
                this._rec_draw(next_arc, matrix, webgl_manager, uniforms, material);
                matrix = this.matrix_stack.pop();
            }
        }
    }

    // debug(arc=null) {
    //     if (arc === null)
    //         arc = this.root;
    //
    //     if (arc !== this.root) {
    //         arc.articulation_matrix = arc.articulation_matrix.times(Mat4.rotation(0.02, 0, 0, 1));
    //     }
    //
    //     const node = arc.child_node;
    //     for (const next_arc of node.children_arcs) {
    //         this.debug(next_arc);
    //     }
    // }
    debug(arc=null, id=null) {

        // this.theta = this.theta.map(x => x + 0.01);
        // console.log("first theta", this.theta);
        // this.apply_theta();
        console.log("pre", this.get_end_effector_position());
        const J = this.calculate_Jacobian();
        let dx = [[0], [-0.02], [0]];
        if (id === 2)
            dx = [[-0.02], [0], [0]];
        const dtheta = this.calculate_delta_theta(J, dx);
        console.log("debug", dtheta);
        console.log("next", this.get_end_effector_position());


        // const direction = new Array(this.dof);
        // let norm = 0;
        // for (let i = 0; i < direction.length; i++) {
        //     direction[i] = dtheta[i][0];
        //     norm += direction[i] ** 2.0;
        // }
        // norm = norm ** 0.5;
        // console.log(direction);
        // console.log(norm);
        // this.theta = this.theta.map((v, i) => v + 0.01 * (direction[i] / norm));

        /*
        this.theta = this.theta.map((v, i) => v + dtheta[i][0]);
        this.apply_theta();
         */

        // if (arc === null)
        //     arc = this.root;
        //
        // if (arc !== this.root) {
        //     arc.articulation_matrix = arc.articulation_matrix.times(Mat4.rotation(0.02, 0, 0, 1));
        // }
        //
        // const node = arc.child_node;
        // for (const next_arc of node.children_arcs) {
        //     this.debug(next_arc);
        // }
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

    update_pos(pos) {
        this.articulation_matrix = Mat4.identity();
        this.articulation_matrix.pre_multiply(Mat4.translation(pos[0], pos[1], pos[2]));
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