const { mat4 } = glMatrix;

/**
 * Initialize WebGL context and clear canvas
 */
function start() {
	const canvas = document.getElementById("glcanvas");

	// Init WebGL context
	const gl = initWebGL(canvas);

	// Obtain shader program
	const shaderProgram = compileShaderProgram(gl, vertexShader, fragmentShader);

	if (gl) {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	} else  {
		alert("Unable to initialize WebGL. Your browser may not support it.");
	}

	// const figure = new TexturedCube(gl);
	const figure = new TexturedCube(gl);
	const texture = loadTexture(gl, 'https://raw.githubusercontent.com/d-makarov-d/webgl-lut/master/res/box_tex1.png');

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
		drawSingleFigureScene(gl, shaderProgram, figure, texture, sceneConfig)

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
		gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
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
