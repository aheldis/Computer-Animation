import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component } = tiny;

export class Spline {
    constructor() {
        this.points = [];
    }

    add_point(pos) {
        this.points.push(pos);
    }

    get_position(t) {
        let s = (Math.sin(t) + 1) / 2;
        console.log(s);
        let p0 = this.points[0].copy();
        let p1 = this.points[1].copy();
        return  p0.times(2 * Math.pow(s, 3) - 3 * Math.pow(s, 2) + 1).plus(
                p1.times(-2 * Math.pow(s, 3) + 3 * Math.pow(s, 2)));

    }


}
