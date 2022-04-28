/**
 * Initialize WebGL context and clear canvas
 */
function start() {
	const canvas = document.getElementById("glcanvas");

	// Init WebGL context
	const gl = initWebGL(canvas);

	if (gl) {
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	} else  {
		alert("Unable to initialize WebGL. Your browser may not support it.");
	}

	// Process window resize
	window.addEventListener("resize", (event, ev) => {
		gl.viewport(0, 0, canvas.width, canvas.height);
	});
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
