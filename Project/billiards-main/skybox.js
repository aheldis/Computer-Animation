import {tiny, defs} from './examples/common.js';

// Pull these names into this module's scope for convenience:
const {vec3, vec4, color, Mat4, Shape, Material, Shader, Texture, Component} = tiny;

const sky_faces = [
    "assets/sky_right.png",
    "assets/sky_left.png",
    "assets/sky_top.png",
    "assets/sky_bottom.png",
    "assets/sky_front.png",
    "assets/sky_back.png"
]

const bar_faces = [
    "assets/bar_right.png",
    "assets/bar_left.png",
    "assets/bar_top.png",
    "assets/bar_bottom.png",
    "assets/bar_front.png",
    "assets/bar_back.png"
]

const settings = {
    "sky": sky_faces,
    "bar": bar_faces
}

export class Background {
    constructor (setting, geometry) {
        this.material = { shader: new Skybox_Shader(), ambient: 1, texture: new Texture_Cube(settings[setting]) };
        this.geometry = geometry;
    }
    draw_sky(webgl_manager, uniforms) {
        const gl = webgl_manager.context;
        gl.depthMask(false);
        let view = uniforms.camera_inverse.copy();
        for (let i = 0; i < 3; i++) {
            uniforms.camera_inverse[i][3] = 0;
        }
        // let skybox_transform = Mat4.translation(0, 15, 0).times(Mat4.scale(30, 30, 30));
        // idk how the scene is initialized but if w no scaling, seems to have some z buffering issues?
        this.geometry.draw(webgl_manager, uniforms, Mat4.scale(1.5, 1.5, 1.5), this.material);
        gl.depthMask(true);
        uniforms.camera_inverse = view;
    }
    draw_ground(webgl_manager, uniforms, geometry, material) {
        let ground_transform = Mat4.translation(0, -3.1, 1).times(Mat4.scale(5, 0.05, 10));
        geometry.draw(webgl_manager, uniforms, ground_transform, material);
    }
}

class Graphics_Card_Object {
    // ** Graphics_Card_Object** Extending this base class allows an object to
    // copy itself onto a WebGL context on demand, whenever it is first used for
    // a GPU draw command on a context it hasn't seen before.
    constructor() {
        this.gpu_instances = new Map()
    }     // Track which GPU contexts this object has copied itself onto.
    copy_onto_graphics_card(context, intial_gpu_representation) {
        // copy_onto_graphics_card():  Our object might need to register to multiple
        // GPU contexts in the case of multiple drawing areas.  If this is a new GPU
        // context for this object, copy the object to the GPU.  Otherwise, this
        // object already has been copied over, so get a pointer to the existing
        // instance.  The instance consists of whatever GPU pointers are associated
        // with this object, as returned by the WebGL calls that copied it to the
        // GPU.  GPU-bound objects should override this function, which builds an
        // initial instance, so as to populate it with finished pointers.
        const existing_instance = this.gpu_instances.get(context);

        // Warn the user if they are avoidably making too many GPU objects.  Beginner
        // WebGL programs typically only need to call copy_onto_graphics_card once
        // per object; doing it more is expensive, so warn them with an "idiot
        // alarm". Don't trigger the idiot alarm if the user is correctly re-using
        // an existing GPU context and merely overwriting parts of itself.
        if (!existing_instance) {
            Graphics_Card_Object.idiot_alarm |= 0;     // Start a program-wide counter.
            if (Graphics_Card_Object.idiot_alarm++ > 200)
                throw `Error: You are sending a lot of object definitions to the GPU, probably by mistake!  
                Many of them are likely duplicates, which you don't want since sending each one is very slow.  
                To avoid this, from your display() function avoid ever declaring a Shape Shader or Texture (or 
                subclass of these) with "new", thus causing the definition to be re-created and re-transmitted every
                frame. Instead, call these in your scene's constructor and keep the result as a class member, 
                or otherwise make sure it only happens once.  In the off chance that you have a somehow deformable 
                shape that MUST change every frame, then at least use the special arguments of 
                copy_onto_graphics_card to limit which buffers get overwritten every frame to only 
                the necessary ones.`;
        }
        // Check if this object already exists on that GPU context.
        return existing_instance ||             // If necessary, start a new object associated with the context.
            this.gpu_instances.set(context, intial_gpu_representation).get(context);
    }

    activate(context, ...args) {                            // activate():  To use, super call it to retrieve a container of GPU
        // pointers associated with this object.  If none existed one will be created.
        // Then do any WebGL calls you need that require GPU pointers.
        return this.gpu_instances.get(context) || this.copy_onto_graphics_card(context, ...args)
    }
}

export class Texture_Cube extends Graphics_Card_Object {
    // **Texture_Cube** wraps a pointer to new texture images where
    // it is stored in GPU memory, along with new HTML image objects.
    // This class initially copies the images to the GPU buffers,
    // optionally generating mip maps of it and storing them there too.
    //
    // Instead of a filename, it takes an array of filenames
    // Only used for loading a skybox from images
    constructor(filenames, min_filter = "LINEAR_MIPMAP_LINEAR") {
        super();
        Object.assign(this, {filenames, min_filter});
        this.images = Array.apply(null, Array(filenames.length));

        for (let i = 0; i < filenames.length; i++) {
            // Create a new HTML Image object:
            this.images[i] = new Image();
            this.images[i].onload = () => this.ready = true;
            this.images[i].crossOrigin = "Anonymous";           // Avoid a browser warning.
            this.images[i].src = filenames[i];
        }
    }

    copy_onto_graphics_card(context, need_initial_settings = true) {
        // copy_onto_graphics_card():  Called automatically as needed to load the
        // texture image onto one of your GPU contexts for its first time.

        // Define what this object should store in each new WebGL Context:
        const initial_gpu_representation = {texture_buffer_pointer: undefined};
        // Our object might need to register to multiple GPU contexts in the case of
        // multiple drawing areas.  If this is a new GPU context for this object,
        // copy the object to the GPU.  Otherwise, this object already has been
        // copied over, so get a pointer to the existing instance.
        const gpu_instance = super.copy_onto_graphics_card(context, initial_gpu_representation);

        if (!gpu_instance.texture_buffer_pointer) gpu_instance.texture_buffer_pointer = context.createTexture();

        const gl = context;
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, gpu_instance.texture_buffer_pointer);

        if (need_initial_settings) {
            // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        }
        for (let i = 0; i < this.images.length; i++) {
            gl.texImage2D(
                gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,      // target
                0,                  // mip level
                gl.RGB, // internal format
                gl.RGB, // format
                gl.UNSIGNED_BYTE,    // type
                this.images[i]);              // data
        }

        return gpu_instance;
    }

    activate(context, texture_unit = 0) {
        // activate(): Selects this Texture in GPU memory so the next shape draws using it.
        // Optionally select a texture unit in case you're using a shader with many samplers.
        // Terminate draw requests until the image file is actually loaded over the network:
        if (!this.ready)
            return;
        const gpu_instance = super.activate(context);
        context.activeTexture(context["TEXTURE" + texture_unit]);
        context.bindTexture(context.TEXTURE_CUBE_MAP, gpu_instance.texture_buffer_pointer);
    }
}

export class Skybox_Shader extends defs.Phong_Shader {
    // Shader for all passes to bind textures to cubemap
    // Same as normal Phong Shader, but uses static camera
    vertex_glsl_code() {
        // ********* VERTEX SHADER *********
        return this.shared_glsl_code() + `
            varying vec3 f_tex_coord;
            attribute vec3 position, normal;                            
            // Position is expressed in object coordinates.
            attribute vec2 texture_coord;
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;
                // Turn the per-vertex texture coordinate into an interpolated variable.
                f_tex_coord = position;
              } `;
    }

    fragment_glsl_code() {
        // ********* FRAGMENT SHADER *********
        // A fragment is a pixel that's overlapped by the current triangle.
        // Fragments affect the final image or get discarded due to depth.
        return this.shared_glsl_code() + `
            varying vec3 f_tex_coord;
            uniform samplerCube skybox;
    
            void main(){
                // Sample the texture image in the correct place:
                vec4 tex_color = textureCube( skybox, f_tex_coord );
                                                                         // Compute an initial (ambient) color:
                gl_FragColor = vec4( tex_color ); 
              } `;
    }

    update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
        // update_GPU(): Add a little more to the base class's version of this method.
        super.update_GPU(context, gpu_addresses, gpu_state, model_transform, material);

        if (material.texture && material.texture.ready) {
            // Select texture unit 0 for the fragment shader Sampler2D uniform called "texture":
            context.uniform1i(gpu_addresses.texture, 0);
            // For this draw, use the texture image from correct the GPU buffer:
            material.texture.activate(context);
        }
    }
}