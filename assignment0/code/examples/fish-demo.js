import {tiny, defs} from './common.js';
import {Fish, School, Game, PVector, pv_dist} from './../project/fish_engine.js'
import {Food} from './../project/food_engine.js'

                                                  // Pull these names into this module's scope for convenience:
const { vec3, vec4, color, Mat4, Shape, Shader, Texture, Component } = tiny;
const {Renderer, Entity, Camera, Light, Material} = defs

export
const Fish_Demo = defs.Fish_Demo =
class Fish_Demo extends Component {
  init () {

    this.game = new Game();
    this.old_t = 0;
    this.t  =    0;
    this.dt    = 0;   // incremental spin time only when actually spinning
    this.background_color = vec4 (0.0, 0.41, 0.58, 1.0);
    this.background_set = false;

    this.food_list = [];

    debugger;

    this.shapes = {
         cylinder: new defs.Shape_From_File("models/cylinder.obj"),
         ball: new defs.Shape_From_File("models/textured_obj/obstacle_textured/sphere6.obj"),
         //box_2: new defs.Cube2(),
         //axis: new Axis_Arrows(),
         //complex_shape: new Cube(),
         //"teapot": new Shape_From_File("assets/teapot.obj"),  // why the quotes?
         fish: new defs.Shape_From_File("models/textured_obj/fish_CM_textured/fish_CM_textured.obj"),
         fish2: new defs.Shape_From_File("models/fish2.obj"),
         herring: new defs.Shape_From_File("models/herring.obj"),
         simple_fish: new defs.Shape_From_File("models/simple_fish.obj"),
         shark_CM: new defs.Shape_From_File("models/textured_obj/shark_CM_textured/shark_CM_textured.obj"),
         shark_OM: new defs.Shape_From_File("models/textured_obj/shark_OM_textured/shark_OM_textured.obj"),
         //shark_CM: new defs.Shape_From_File("models/textured_obj/shark_CM_70/shark_CM_70.obj"),
         //shark_OM: new defs.Shape_From_File("models/textured_obj/shark_OM_70/shark_OM_70.obj"),

         // animated shark sequence
         shark_2l: new defs.Shape_From_File("models/shark_2l.obj"),
         shark_1l: new defs.Shape_From_File("models/shark_1l.obj"),
         shark_c: new defs.Shape_From_File("models/shark_c.obj"),
         shark_1r: new defs.Shape_From_File("models/shark_1r.obj"),
         shark_2r: new defs.Shape_From_File("models/shark_2r.obj"),
         // Shrimp
         food: new defs.Shape_From_File("models/copepod.obj"),
         //Floor
         sea_floor: new defs.Shape_From_File("models/textured_obj/sea_floor_textured/sea_floor.obj"),
         sand_floor: new defs.Shape_From_File("models/textured_obj/sand_floor_textured/sand_floor.obj"),
         //Sky
         sea_sky: new defs.Shape_From_File("models/textured_obj/sea_sky_textured/sea_sky.obj"),
      }

    this.shader = new defs.Shadow_Instanced_Shader (Light.NUM_LIGHTS);
    this.textured_shader = new defs.Shadow_Textured_Instanced_Shader (Light.NUM_LIGHTS);

    this.materials = {
      food: new Material("Food", this.shader, { color: vec4(0.92, 0.22, 0.66, 1.0), diffuse: vec3(0.92, 0.22, 0.66), specular: vec3(1.0, 1.0, 1.0), smoothness: 32.0 }),
      coral: new Material("Coral", this.textured_shader, { color: vec4(0.5, 0.5, 0.5, 1.0), diffuse: vec3(0.5, 0.5, 0.5), specular: vec3(1.0, 1.0, 1.0), smoothness: 32.0 }, {diffuse_texture: new Texture("models/textured_obj/obstacle_textured/coral.png")}),
      fish: new defs.Material_From_File("Fish", this.textured_shader, "models/textured_obj/fish_CM_textured/fish_CM_textured.mtl"),
      shark: new defs.Material_From_File("Shark", this.textured_shader, "models/textured_obj/shark_CM_textured/shark_CM_textured.mtl"),
      sea_floor: new defs.Material_From_File("Sea_Floor", this.textured_shader, "models/textured_obj/sea_floor_textured/sea_floor.mtl"),
      sand_floor: new defs.Material_From_File("Sand_Floor", this.textured_shader, "models/textured_obj/sand_floor_textured/sand_floor.mtl"),
      sea_sky: new defs.Material_From_File("Sea_Sky", this.textured_shader, "models/textured_obj/sea_sky_textured/sea_sky.mtl"),
   }

    this.sun_dir = vec4(0.0, 5.0, 7.0, 0.0);
    this.sun = new Light({direction_or_position: this.sun_dir, color: vec3(1.0, 1.0, 1.0), diffuse: 0.6, specular: 0.1, attenuation_factor: 0.000001,
                          shadow_map_width: 1024, shadow_map_height: 1024, casts_shadow: true});

    this.camera = new Camera(vec3(0.0, 0.0, 40.0));

    this.renderer = new Renderer();

    this.fish_entity = new Entity(this.shapes.fish, Mat4.identity(), this.materials.fish);
    this.shark_CM_entity = new Entity(this.shapes.shark_CM, Mat4.identity(), this.materials.shark);
    this.shark_OM_entity = new Entity(this.shapes.shark_OM, Mat4.identity(), this.materials.shark);
    this.food_shrimp_entity = new Entity(this.shapes.food, Mat4.identity(), this.materials.food);
    this.obstacle_ball_entity = new Entity(this.shapes.ball, Mat4.identity(), this.materials.coral);
    this.floor_entity = new Entity(this.shapes.sand_floor, Mat4.scale(500.0, 1.0, 500.0).times(Mat4.translation(0.0, -60.0, 0.0)), this.materials.sand_floor);
    this.sky_entity = new Entity(this.shapes.sea_sky, Mat4.scale(500.0, 1.0, 500.0).times(Mat4.translation(0.0, 80.0, 0.0)), this.materials.sea_sky);
  }


  render_animation (caller) {

    if (!this.background_set) {
      caller.context.clearColor.apply (caller.context, this.background_color);
      this.background_set = true;
    }


    // Handle time
    let t = this.uniforms.animation_time / 400;
    let dt = this.uniforms.animation_delta_time / 400;
    let d=0;
    if(this.t==0)this.t = t;
    this.old_t = this.t;
    this.t = t;
    //this.dt = 0;
    if(this.spinning) {
        d = this.t - this.old_t;
        this.dt = this.dt + d;
        //console.log("Spinning dt = " + this.dt);
    }

    if( !caller.controls )
    {
      this.uniforms.camera_inverse = this.camera.view;
      this.animated_children.push( caller.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
              () => {this.camera.initialize(caller)}
              ) );
      caller.controls.add_mouse_controls( caller.canvas );

      this.camera.initialize(caller);
    }

    let sun_movement_y = 0.05 * Math.sin(t);
    let sun_movement_z = 0.05 * Math.cos(t);

    this.sun.direction_or_position = this.sun_dir.plus(vec4(0.0, sun_movement_y, sun_movement_z, 0.0));
    this.sun.initialize(caller);
    let Lights = [this.sun];

    //FISH AND SHARK UPDATE
    let fish_list =  this.game.move(this.food_list, dt);
    let fish_map = {fish: [], shark_CM: [], shark_OM: []};
    for(let f of fish_list) {
      this.draw_fish(caller.context, this.uniforms, f, fish_map);
    }
    this.fish_entity.set_transforms(fish_map["fish"]);
    this.shark_CM_entity.set_transforms(fish_map["shark_CM"]);
    this.shark_OM_entity.set_transforms(fish_map["shark_OM"]);

    //OBSTACLES UPDATE
    let obstacle_list = this.game.school.obstacle_list;
    let obstacle_map = {obstacle: [], ball: [], cylinder: []};
    for(let f of obstacle_list) {
        this.draw_obstacle(caller.context, this.uniforms, f, obstacle_map);
    }
    this.obstacle_ball_entity.set_transforms(obstacle_map["ball"]);

    //FOOD UPDATE
    let food_map = {shrimp: []};
    for(let f of this.food_list) {
        this.draw_food(caller.context, this.uniforms, f, food_map);
    }
    this.food_shrimp_entity.set_transforms(food_map["shrimp"]);

    this.renderer.submit(this.fish_entity);
    this.renderer.submit(this.shark_CM_entity);
    this.renderer.submit(this.shark_OM_entity);
    this.renderer.submit(this.obstacle_ball_entity);
    this.renderer.submit(this.food_shrimp_entity);
    this.renderer.shadow_map_pass(caller, Lights);

    this.renderer.submit(this.sky_entity);
    this.renderer.submit(this.floor_entity);
    this.renderer.flush(caller, Lights);
  }

  draw_fish (context, program_state, f, map) {

    let fish_type = f.type;
    let x=f.position.x;
    let y=f.position.y;
    let z=f.position.z;
    let a=f.theta();
    let az=f.phi();

    //console.log("draw_fish " + i);

    let m = Mat4.identity();

    // Let's try offsetting the shark a little bit to move center point
    if(f.type == "no_shark") {  // disabled
           m = m.times(Mat4.translation(-.2,0,0));
    }

    m = m.times(Mat4.translation(x, y, -z));     // translate the rotated fish into position
    m = m.times(Mat4.rotation(a, 0, 1, 0));     // rotate fish in horizontal plane (around y)
    m = m.times(Mat4.rotation(az, 0, 0, 1));    // rotate up (around z)

    // this area can be optimized to omit calculations for dead fish.

    let my_scale = 2;

    if(f.type == "fish"  && f.live == true) {
        my_scale = 2;
        m=m.times(Mat4.scale(my_scale, my_scale, my_scale));
        map[f.type].push(m);
    }

    if(f.type == "shark") {
         my_scale = 5;
         m=m.times(Mat4.scale(my_scale, my_scale, my_scale));

         map[f.mouth_state].push(m);
         // if we knew if the shark is turning left or right we could
         // use the images shark_2l, shark_1l, shark_c, shark_1r, shark_2r
         // to bend the shark appropriately
         //console.log(f.mouth_state);
         if(f.mouth_state == "shark_CM"){
         //   this.shapes.shark.draw(context, program_state, m, this.materials.phong);
         }
         else if(f.mouth_state == "shark_OM"){

         //   this.shapes.shark_OM.draw(context, program_state, m, this.materials.phong);
         }

    }
 }

 draw_obstacle(context, program_state, f, map) {

  let x=f.position.x;
  let y=f.position.y;
  let z=f.position.z;
  let r=f.r;
  let h=f.h;

  //console.log("draw_fish " + i);

  let m = Mat4.identity();

  m = m.times(Mat4.translation(x, y, -z));     // translate the rotated fish into position

  // this area can be optimized to omit calculations for dead fish.

  let my_scale = 1;

  if(f.type == "obstacle") {
      m=m.times(Mat4.scale(r, r, r));
      //this.shapes.cube.draw(context, program_state, m, this.materials.phong);
  }

  if(f.type == "ball") {
      m=m.times(Mat4.scale(r, r, r));
      //this.shapes.ball.draw(context, program_state, m, this.materials.phong);
  }

  if(f.type == "cylinder") {
       m=m.times(Mat4.scale(r, h, r));
       //this.shapes.cylinder.draw(context, program_state, m, this.materials.phong);
  }

  map[f.type].push(m);
}

draw_food(context, program_state, t, map) {
  //console.log("Draw food called.");
  for(let i = 0;i < this.food_list.length;i++) {
      if(this.food_list[i].eaten == false) {
          //console.log(this.food_list[i].jump == true);
          if(this.food_list[i].jump == true && this.food_list[i].lastJumpTime + this.jump_interval < t) {
              this.food_list[i].lastJumpTime = t;
              this.food_list[i].jump = false;
              this.food_list[i].position.y = this.food_list[i].position.y + 8;
              let position = this.food_list[i].get_position();
              let location = Mat4.identity().times(Mat4.translation(position.x, position.y, position.z));
              map["shrimp"].push(location);
          } else {
              let position = this.food_list[i].get_position();
              let location = Mat4.identity().times(Mat4.translation(position.x, position.y, position.z));
              map["shrimp"].push(location);
          }

      }
  }
}

render_controls () {
  // this.key_triggered_button("Spin Cubes ", ["c"], this.do_c);
  // this.new_line();
  // debugger;
  this.key_triggered_button("Add Food "          , ["Control", "0"], this.add_food);
  this.new_line();
  this.key_triggered_button("Add a Shark "       , ["Control", "1"], this.add_shark);
  this.new_line();
  this.key_triggered_button("Add a Fish "        , ["Control", "2"], this.add_fish);
  this.new_line();
  this.key_triggered_button("Add School of Fish ", ["Control", "3"], this.add_school_fish);
  this.new_line();
  this.key_triggered_button("Clear Fish "        , ["Control", "4"], this.clear_fish);



  // this.new_line();
  //this.key_triggered_button("Zoom Start "        , ["Control", "5"], this.zoom_start);
  //this.new_line();
  //this.key_triggered_button("Zoom top "          , ["Control", "6"], this.zoom_top);
  //this.new_line();
  //this.key_triggered_button("Zoom Front "        , ["Control", "7"], this.zoom_front);
  //this.new_line();

  //this.new_line();
  //this.key_triggered_button("Zoom Angle ", ["Control", "3"], this.zoom_angle);
}

add_shark() {
  //console.log("Add shark");
  this.game.school.add_a_shark();
}

add_fish() {
  //console.log("Add fish");
  this.game.school.add_a_fish();
}

add_school_fish() {
  //console.log("Add a school of fish");
  this.game.school.add_school_fish();
}

clear_fish() {
  //console.log("Clearing all fish from this simulation");
  this.game.school.clear_all_fish();
}

   zoom_back() {
      console.log ("Zoom Back");
      //this.initial_camera_location = Mat4.look_at(vec3(0, 0, 100), vec3(0, 0, 0), vec3(0, 1, 0));
      //this.program_state.set_camera(this.initial_camera_location);


    this.camera = new Camera(vec3(0.0, 0.0, 140.0));   // this does not work
      this.uniforms.camera_inverse = this.camera.view;
      this.animated_children.push( caller.controls = new defs.Movement_Controls(
              { uniforms: this.uniforms },
              () => {this.camera.initialize(caller)}
              ) );
      caller.controls.add_mouse_controls( caller.canvas );

      this.camera.initialize(caller);


   }    
   zoom_top() {
      console.log ("Zoom Top");
      this.initial_camera_location = Mat4.look_at(vec3(0, 100, 0), vec3(0, 0, 0), vec3(1, 0, 0));
      //this.program_state.set_camera(this.initial_camera_location);
   }    
   zoom_front() {
      console.log ("Zoom Front");
      this.initial_camera_location = Mat4.look_at(vec3(0, 0, -100), vec3(0, 0, 0), vec3(0, 1, 0));
      //this.program_state.set_camera(this.initial_camera_location);
   }    
   zoom_start() {
      console.log ("Zoom Start");
      this.initial_camera_location = Mat4.look_at(vec3(0, 0,-60), vec3(0, 0, 0), vec3(0, 1, 0));
      //program_state.set_camera(this.initial_camera_location);
   }

add_food() {
   // Create a Copepod (shrimp) at a random location
   let food_coord = this.game.school.get_open_location();
   let f = new Food(food_coord.x, food_coord.y, food_coord.z);
   this.food_list.push(f);
   //console.log ("Add Food: " + JSON.stringify(f));
}

};
