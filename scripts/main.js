const { mat4 } = glMatrix;

/**
 * Initialize WebGL context and clear canvas
 */
function start() {
	const canvas = document.getElementById("glcanvas");
	const btnContainer = document.getElementById("btn_container");

	// Init WebGL context
	const gl = initWebGL(canvas);

	// Obtain shader program
	const shaderProgram = compileShaderProgram(gl, vertexShader, fragmentShader);
	const programFlat = compileShaderProgram(gl, vertexFlat, fragmentFlat);

	if (!gl) {
		alert("Unable to initialize WebGL. Your browser may not support it.");
	}

	const textureHolder = new LUTTexturesHolder(gl, btnContainer);

	const figure = new TexturedCube(gl);
	const texture = loadTexture(gl, 'https://raw.githubusercontent.com/d-makarov-d/webgl-lut/master/res/box_tex1.png');

	const {fb: framebuffer, tx: fbTexture} = createFramebuffer(gl, canvas.width, canvas.height);

	// Draw the scene repeatedly
	function render(now) {
		now *= 0.001;  // convert to seconds
		const freqX = 2;
		const freqZ = 1;

		const sceneConfig = {
			dZ: -6,
			rotX: (now * freqX) % (Math.PI * 2),
			rotZ: (now * freqZ) % (Math.PI * 2),
		}

		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		drawSingleFigureScene(gl, shaderProgram, figure, texture, sceneConfig);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		drawFromFramebuffer(gl, framebuffer, fbTexture, textureHolder.currentTexture(), programFlat);

		requestAnimationFrame(render);
	}
	requestAnimationFrame(render);
}

/**
 * Tries to get WebGL context
 * @param canvas
 * @return {null|RenderingContext} Context on success, null else
 */
function initWebGL(canvas) {
	let gl = null;

	try {
		gl = canvas.getContext("webgl2") || canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
	} catch(e) {}

	if (!gl) {
		gl = null;
	}

	return gl;
}

/**
 * Draw a scene with single figure
 * @param {RenderingContext} gl,
 * @param {WebGLProgram} program
 * @param {TexturedFigure} figure
 * @param {WebGLTexture} texture
 * @param {Object} config Scene configuration e.g. scene translation, rotation
 */
function drawSingleFigureScene(
	gl,
	program,
	figure,
	texture,
	config
) {
	// Configure
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	// Clear scene
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearDepth(1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	// Define projection
	const fieldOfView = 45 * Math.PI / 180;   // in radians
	const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
	const zNear = 0.1;
	const zFar = 100.0;
	const projectionMatrix = mat4.create();
	mat4.perspective(
		projectionMatrix,
		fieldOfView,
		aspect,
		zNear,
		zFar
	);

	// Apply transformations to scene
	const rotX = config.rotX || 0;
	const rotY = config.rotY || 0;
	const rotZ = config.rotZ || 0;
	const dX = config.dX || 0;
	const dY = config.dY || 0;
	const dZ = config.dZ || 0;
	const modelViewMatrix = mat4.create();

	mat4.translate(
		modelViewMatrix,
		modelViewMatrix,
		[dX, dY, dZ]
	);
	mat4.rotateX(
		modelViewMatrix,
		modelViewMatrix,
		rotX
	);
	mat4.rotateY(
		modelViewMatrix,
		modelViewMatrix,
		rotY
	);
	mat4.rotateZ(
		modelViewMatrix,
		modelViewMatrix,
		rotZ
	);

	figure.bind(program, 'aVertexPosition', 'aTextureCoord')

	gl.useProgram(program);

	// Bind uniform variables
	gl.uniformMatrix4fv(
		gl.getUniformLocation(program, 'uProjectionMatrix'),
		false,
		projectionMatrix
	);
	gl.uniformMatrix4fv(
		gl.getUniformLocation(program, 'uModelViewMatrix'),
		false,
		modelViewMatrix
	);

	figure.constructor.activateTexture(
		gl,
		gl.getUniformLocation(program, 'uSampler'),
		texture,
	)

	gl.drawElements(gl.TRIANGLES, figure.vertexCount(), gl.UNSIGNED_SHORT, 0);
}

/**
 * @param {RenderingContext} gl
 * @param {WebGLFramebuffer} framebuffer
 * @param {WebGLTexture} texture
 * @param {WebGLTexture} lut LUT 3D texture
 * @param {WebGLProgram} program
 */
function drawFromFramebuffer(
	gl,
	framebuffer,
	texture,
	lut,
	program
) {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	gl.useProgram(program);

	gl.uniform1i(gl.getUniformLocation(program, 'uSampler'), 0);
	gl.uniform1i(gl.getUniformLocation(program, 'uSamplerLUT'), 1);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.activeTexture(gl.TEXTURE0 + 1);
	gl.bindTexture(gl.TEXTURE_3D, lut);

	const vertex = [
		-1, -1,
		-1,  1,
		 1,  1,
		 1,  1,
		 1, -1,
		-1, -1,
	];
	const vertBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex), gl.STATIC_DRAW);

	const positionLocation = gl.getAttribLocation(program, "aPosition");
	gl.vertexAttribPointer(
		positionLocation,
		2,					// N Components
		gl.FLOAT,
		false, // Normalize
		0,					// Stride
		0					// Offset
	)
	gl.enableVertexAttribArray(positionLocation);

	gl.drawArrays(gl.TRIANGLES, 0, 6);
}

// UTILITY FUNCTIONS
class TexturedFigure {
	/**
	 * @param {RenderingContext} gl
	 */
	constructor(gl) {
		this.gl = gl;
	}
	/**
	 * Vertex positions of the figure
	 * @return {Float32Array}
	 */
	vertexPos() {
		return new Float32Array(0);
	}

	/**
	 * Texture coordinates
	 * @return {Float32Array}
	 */
	texCoords() {
		return new Float32Array(0);
	}

	/**
	 * Indices, showing the right vertex order
	 * @return {Uint16Array}
	 */
	indices() {
		return new Uint16Array(0);
	}

	/**
	 * Bind data to WebGL buffer and point shader variables to data
	 * @param {WebGLProgram} program Shader program
	 * @param {String} vertexName Shader variable name, holding vertices
	 * @param {String} texName Shader variable name, texture coordinates
	 */
	bind(program, vertexName, texName) {
		const gl = this.gl

		// Binds vertices
		const vertexBuf = gl.createBuffer();
		const vertexUnit = gl.getAttribLocation(program, vertexName)
		gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertexPos()), gl.STATIC_DRAW)
		gl.vertexAttribPointer(
			vertexUnit,
			3,					// N Components
			gl.FLOAT,
			false, // Normalize
			0,					// Stride
			0					// Offset
		)
		gl.enableVertexAttribArray(vertexUnit)

		// Bind texture coordinates
		const texBuf = gl.createBuffer();
		const texUnit = gl.getAttribLocation(program, texName)
		gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texCoords()), gl.STATIC_DRAW)
		gl.vertexAttribPointer(
			texUnit,
			2,					// N Components
			gl.FLOAT,
			false, // Normalize
			0,					// Stride
			0					// Offset
		)
		gl.enableVertexAttribArray(texUnit)

		// Bind indices
		const indexBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices()), gl.STATIC_DRAW);
	}

	/**
	 * @return {Number}
	 */
	vertexCount() {
		return this.indices().length
	}

	/**
	 * Activate texture for this figure type
	 * @param {RenderingContext} gl
	 * @param {WebGLUniformLocation} samplerLoc pointer to Sampler in shader program
	 * @param {WebGLTexture} texture Texture to activate
	 * @param {Number} unit Texture unit
	 */
	static activateTexture(gl, samplerLoc, texture, unit= 0) {
		gl.activeTexture(gl.TEXTURE0 + unit);
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.uniform1i(samplerLoc, unit);
	}
}

class TexturedCube extends TexturedFigure {
	vertexPos() {
		return new Float32Array([
			// Front face
			-1.0, -1.0,  1.0,
			1.0, -1.0,  1.0,
			1.0,  1.0,  1.0,
			-1.0,  1.0,  1.0,

			// Back face
			-1.0, -1.0, -1.0,
			-1.0,  1.0, -1.0,
			1.0,  1.0, -1.0,
			1.0, -1.0, -1.0,

			// Top face
			-1.0,  1.0, -1.0,
			-1.0,  1.0,  1.0,
			1.0,  1.0,  1.0,
			1.0,  1.0, -1.0,

			// Bottom face
			-1.0, -1.0, -1.0,
			1.0, -1.0, -1.0,
			1.0, -1.0,  1.0,
			-1.0, -1.0,  1.0,

			// Right face
			1.0, -1.0, -1.0,
			1.0,  1.0, -1.0,
			1.0,  1.0,  1.0,
			1.0, -1.0,  1.0,

			// Left face
			-1.0, -1.0, -1.0,
			-1.0, -1.0,  1.0,
			-1.0,  1.0,  1.0,
			-1.0,  1.0, -1.0,
		])
	}

	texCoords() {
		const face = [
			0.0,  0.0,
			1.0,  0.0,
			1.0,  1.0,
			0.0,  1.0,
		]
		let coords = []
		for (let i=0; i<6; i++)
			coords = coords.concat(face)
		return new Float32Array(coords)
	}

	indices() {
		const inds = [0,  1,  2,      0,  2,  3];
		return new Uint16Array(
			[...Array(6).keys()].reduce((acc, i) => acc.concat(inds.map((e) => 4 * i + e)), [])
		);
	}
}

/**
 * Reads and compiles shader programs
 * @param {RenderingContext} gl WebGL rendering context
 * @param {string} vertex Vertex shader source
 * @param {string} fragment Fragment shader source
 * @return {null | WebGLProgram} Compiled and linked shader program on success, null on failure
 */
function compileShaderProgram(gl, vertex, fragment) {
	// Try compiling shader. Return null on failure
	function loadShader(type, src) {
		const shader = gl.createShader(type);
		gl.shaderSource(shader, src);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
			gl.deleteShader(shader);
			return null;
		}

		return shader;
	}

	const vertexShader = loadShader(gl.VERTEX_SHADER, vertex);
	const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragment);

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
		return null;
	}

	return shaderProgram;
}

/**
 * Initialize texture from image url
 * @param {RenderingContext} gl WebGL rendering context
 * @param url Image url
 * @return {WebGLTexture}
 */
function loadTexture(gl, url) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	// Init texture with single pixel
	gl.texImage2D(
		gl.TEXTURE_2D,                                // Target
		0,                                            // Level
		gl.RGBA,                                      // Internal format
		1,                                            // Width
		1,                                            // Height
		0,                                            // Border
		gl.RGBA,                                      // Format
		gl.UNSIGNED_BYTE,															// Data type
		new Uint8Array([255, 255, 255, 255])	// Pixel data
	);

	const image = new Image();
	image.crossOrigin = "anonymous";
	image.src = url;
	image.onload = () => {
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(
			gl.TEXTURE_2D,			// Target
			0,									// Level
			gl.RGBA,						// Internal format
			gl.RGBA, 						// Format
			gl.UNSIGNED_BYTE, 	// Data type
			image
		);

		function isPowerOf2(value) {
			return (value & (value - 1)) == 0;
		}
		// WebGL1 has different requirements for power of 2 images
		// vs non power of 2 images so check if the image is a
		// power of 2 in both dimensions.
		if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
			// Yes, it's a power of 2. Generate mips.
			gl.generateMipmap(gl.TEXTURE_2D);
		} else {
			// No, it's not a power of 2. Turn of mips and set
			// wrapping to clamp to edge
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}
	};

	return texture;
}

/**
 * Creates framebuffer with a texture which could be rendered to
 * @param {RenderingContext} gl
 * @param {Number} width
 * @param {Number} height
 * @return {{fb: WebGLFramebuffer, tx: WebGLTexture}}
 */
function createFramebuffer (gl, width, height) {
	// create an empty texture
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texImage2D(
		gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
		gl.RGBA, gl.UNSIGNED_BYTE, null
	);

	// Create a framebuffer and attach a texture to it
	const framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

	if (typeof gl === 'WebGLRenderingContext') {
		// WebGL 1 does not put depth buffer by default
		gl.texImage2D(
			gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0,
			gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null
		);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);
	}

	// Attach depth buffer
	const depthBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

	return {fb: framebuffer, tx: texture};
}

class LUTTexturesHolder {
	/**
	 * @param {RenderingContext} gl
	 * @param {HTMLElement} container Container For buttons
	 */
	constructor(gl, container) {
		this.container = container;
		this.buttons = [];
		const neutralTexture = LUTTexturesHolder.#createNeutralLUT(gl);
		this.texture = neutralTexture;

		const btn = this.#createTextureButton('Neutral LUT', neutralTexture);
		this.#selectTexture(btn, neutralTexture);
	}

	/**
	 * Return currently selected LUT texture
	 * @return {WebGLTexture}
	 */
	currentTexture() {
		return this.texture;
	}

	/**
	 * Creates a button to activate the texture
	 * @param {string} name Name on the button
	 * @param {WebGLTexture} texture
	 */
	#createTextureButton(name, texture) {
		const button = document.createElement("button");
		button.classList.add("lut_btn");
		button.innerHTML = name;
		this.buttons.push(button);

		const classThis = this;
		button.addEventListener("click", () => {
			classThis.#selectTexture(button, texture);
		});

		this.container.appendChild(button);

		return button;
	}

	/**
	 * Create neutral LUT 3D, 16x16x16
	 * @param {RenderingContext} gl
	 * @return {WebGLTexture}
	 */
	static #createNeutralLUT(gl) {
		const {width, height, depth} = {width: 16, height: 16, depth:16}
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_3D, tex);

		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

		const data = new Uint8Array(width * height * depth * 4);
		for (let x=0; x<width; x++) {
			for (let y = 0; y < height; y++) {
				for (let z = 0; z < depth; z++) {
					data[(x + y * height + z * height * depth) * 4] = x / (width - 1) * 255;
					data[(x + y * height + z * height * depth) * 4 + 1] = y / (height - 1) * 255;
					data[(x + y * height + z * height * depth) * 4 + 2] = z / (depth - 1) * 255;
					data[(x + y * height + z * height * depth) * 4 + 3] = 255;
				}
			}
		}

		gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGBA, width, height, depth, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);

		return tex;
	}

	#selectTexture(button, texture) {
		this.texture = texture;
		this.buttons.forEach((btn) => btn.classList.remove("btn_selected"));
		button.classList.add("btn_selected");
	}
}

const vertexShader = `
    attribute vec4 aVertexPosition;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;

    varying highp vec2 vTextureCoord;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vTextureCoord = aTextureCoord;
    }
`;

const fragmentShader = `
    varying highp vec2 vTextureCoord;

    uniform sampler2D uSampler;

    void main(void) {
      gl_FragColor = texture2D(uSampler, vTextureCoord);
    }
`;

const vertexFlat = `#version 300 es
    in vec4 aPosition;
    out vec2 vTextureCoord;

    void main() {
      gl_Position = aPosition;
      vTextureCoord = aPosition.xy * 0.5 + 0.5;
    }    
`;
const fragmentFlat = `#version 300 es
		precision mediump float;
		in vec2 vTextureCoord;
		uniform sampler2D uSampler;
		uniform mediump sampler3D uSamplerLUT;
		
		out vec4 outColor;
		void main() {
				vec4 color = texture(uSampler, vTextureCoord);
				vec3 lutSize = vec3(textureSize(uSamplerLUT, 0));
				vec3 coordOnLUT = (color.rgb * float(lutSize - 1.0) + 0.5)/ lutSize;
    		outColor = texture(uSamplerLUT, coordOnLUT);
		}
`;
