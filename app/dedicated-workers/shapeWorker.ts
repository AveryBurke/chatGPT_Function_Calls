import svgPathCommander from "svg-path-commander";
import partitionNumber from "../static/particianNumber";
import { Lloyd } from "@/app/libs/webgl/llyod/lloyd";
import { stencilShaderSource } from "@/app/libs/webgl/llyod/shaders/stencilShaderSource";
import earcut from "earcut";
import * as Comlink from "comlink";
// import * as twgl from "twgl.js";
class ShapeWorker {
	lloyd: InstanceType<typeof Lloyd> | null = null;
	seeds: number[] = [];
	stream = false;
	positions: number[] = [];
	seedBoundryIds: number[] = [];
	sections: Section[] = [];
	sectionIntegerIds: { [sectionID: string]: number } = {};
	boundries: { [sectionID: string]: number[] } = {};
	numPoints: number = 100;
	shapeCanvas: OffscreenCanvas | null = null;
	glCanvas: OffscreenCanvas | null = null;
	gl: WebGL2RenderingContext | null = null;
	ctx: OffscreenCanvasRenderingContext2D | null = null;
	containerWidth = 1122;
	containerHeight = 1122;
	textureWidth = 312;
	textureHeight = 312;
	pxd = 2;
	quad = new Float32Array([
		// First triangle:
		1.0, 1.0, -1.0, 1.0, -1.0, -1.0,
		// Second triangle:
		-1.0, -1.0, 1.0, -1.0, 1.0, 1.0,
	]);

	constructor() {};

	// this is a slow meothd. Think about streaming these results to voronoi generator.
	// look at some of the methods here https://stackoverflow.com/questions/37576685/using-async-await-with-a-foreach-loop
	addSections = async (sections: Section[], generator: any) => {
		this.sections = sections;
		const toRemove: number[] = [];
		const subsections: Section[] = [];
		// add subsection
		for (let i = 0; i < this.sections.length; i++) {
			const section = this.sections[i];
			if (section.count && section.count > 10) {
				const partitions = partitionNumber(section.count, Math.ceil(section.count / 20));
				if (partitions) {
					const { startAngle, endAngle, innerRadius, outerRadius, id } = section;
					for (let j = 0; j < partitions.length; j++) {
						const subarcId = id + `_subsection_${j}`;
						const count = partitions[j];
						const theta = endAngle - startAngle;
						const sa = startAngle + j * (theta / partitions.length);
						const ea = startAngle + (j + 1) * (theta / partitions.length);
						subsections.push({ ...section, startAngle: sa, endAngle: ea, innerRadius, outerRadius, id: subarcId, count });
					}
				}
				toRemove.push(i);
			}
		}
		for (let i = toRemove.length - 1; i >= 0; i--) {
			this.sections.splice(toRemove[i], 1);
		}
		this.sections = [...this.sections, ...subsections];
		for await (const section of this.sections) {
			if (!section.count) continue;
			if (!this.sectionIntegerIds[section.id]) {
				this.sectionIntegerIds[section.id] = Object.keys(this.sectionIntegerIds).length + 1;
			}
			const points: number[] = [];
			const triangles: number[] = [];
			// Comlink.proxy is awaitable. But apparently, js doesn't know that.
			const path = await generator(section);
			const length = svgPathCommander.getTotalLength(path || "");

			for (let i = 0; i < this.numPoints; i++) {
				const { x, y } = svgPathCommander.getPointAtLength(path || "", (i / this.numPoints) * length);
				points.push(x, y);
			}
			// earcut expects the points to be in the form of [x1, y1, x2, y2, x3, y3, ...]
			const ears = earcut(points); //<--returns the indexes of the x coordinates of the triangle vertices, in the points array
			for (let i = 0; i < ears.length; i++) {
				const index = ears[i] * 2;
				triangles.push(
					(points[index] / this.containerWidth) * this.pxd,
					(points[index + 1] / this.containerHeight) * this.pxd,
					this.sectionIntegerIds[section.id]
				);
			}
			this.boundries[section.id] = triangles;
		}
		// this.renderStencil();
		this.seedSections();
		if (this.lloyd) {
			this.lloyd.updateStencil(Object.values(this.boundries).flat());
			this.lloyd.renderStencil();
			console.log("seedBoundryIds", new Set(this.seedBoundryIds));
			this.lloyd.renderInChunks(this.seeds, this.seedBoundryIds);
			// this.lloyd.render();
		}
	};

	seedSections = () => {
		const seeds: number[] = [];
		for (const section of this.sections) {
			console.log("seeding section ", section.id)
			const id = this.sectionIntegerIds[section.id];
			const { startAngle, endAngle, innerRadius, outerRadius, count } = section;
			const arcCount = count || 0;
			for (let i = 0; i < arcCount; ++i) {
				const randomClampedR = Math.random() * (outerRadius - innerRadius) + innerRadius,
					randomClampedTheta = Math.random() * (endAngle - startAngle) + startAngle - Math.PI / 2,
					x = Math.cos(randomClampedTheta) * randomClampedR,
					y = Math.sin(randomClampedTheta) * randomClampedR;
				seeds.push((x / this.containerWidth) * 2, -(y / this.containerHeight) * 2); // <-- is the 2 here on account of the pxd?
				this.seedBoundryIds.push(id);
			}
		}
		this.seeds = seeds;
	};

	transferGLCanvas = (canvas: OffscreenCanvas) => {
		this.glCanvas = canvas;
		this.gl = canvas.getContext("webgl2");
		if (!this.gl) {
			throw new Error("WebGL2 not supported");
		}
		this.lloyd = new Lloyd(this.gl, 312, 312, 100, this.handlePositions);
	};

	transferShapeCanvas = (canvas: OffscreenCanvas) => {
		this.shapeCanvas = canvas;
		this.ctx = canvas.getContext("2d");
	};

	/**
	 * render the background polygones to a uint texture. Each poly gone will be colored accroding to its unique integer id
	 */
	renderStencil() {
		// if (!this.gl || !this.canvas) {
		// 	return;
		// }
		// let stencil: number[] = [];
		// this.sections.forEach((section, i) => {
		// 	// i is the id of the section, for now. Next step is to assign unique integer ids to each section id.
		// 	stencil.push(...this.boundries[section.id]);
		// });
		// const stencilProgram = twgl.createProgramInfo(this.gl, [stencilShaderSource.vertex, stencilShaderSource.fragment], {
		// 	attribLocations: {
		// 		a_position: 0,
		// 	},
		// });
		// const stencilBufferArrays = {
		// 	a_position: {
		// 		numComponents: 3,
		// 		data: new Float32Array(stencil.flat()),
		// 		drawType: this.gl.STATIC_DRAW,
		// 	},
		// };
		// const debugColors = [];
		// for (let i = 0; i < Object.keys(this.sections).length; i++) {
		// 	debugColors.push(Math.random(), Math.random(), Math.random());
		// }
		// const stencilBufferInfo = twgl.createBufferInfoFromArrays(this.gl, stencilBufferArrays);
		// const stencilFrameBufferInfo = twgl.createFramebufferInfo(
		// 	this.gl,
		// 	[
		// 		//we only need 1 and 0 for the stencil.
		// 		{
		// 			internalFormat: this.gl.R32I,
		// 			format: this.gl.RED_INTEGER,
		// 			type: this.gl.INT,
		// 			minMag: this.gl.NEAREST,
		// 		},
		// 	],
		// 	this.textureWidth,
		// 	this.textureHeight
		// );
		// this.gl.useProgram(stencilProgram.program);
		// twgl.setBuffersAndAttributes(this.gl, stencilProgram, stencilBufferInfo);
		// //set the background 'color' to -1//
		// this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, stencilFrameBufferInfo.framebuffer);
		// this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, stencilFrameBufferInfo.attachments[0], 0);
		// this.gl.viewport(0, 0, this.textureWidth, this.textureHeight);
		// this.gl.clearBufferiv(this.gl.COLOR, 0, new Int32Array([-1, 0, 0, 0]));
		// this.gl.drawArrays(this.gl.TRIANGLES, 0, stencil.length / stencilBufferInfo.attribs!.a_position!.numComponents!);
		// this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
		// this.debug("u_stencil", stencilFrameBufferInfo.attachments[0], debugColors); ,
	}

	handlePositions = ({ keepOpen, payload }: { keepOpen: boolean; payload: Float32Array }) => {
		// // start a new stream and clear the positions array
		if (keepOpen && !this.stream) this.positions = [];
		if (keepOpen) this.stream = true;
		if (this.stream) {
			this.positions = [...this.positions, ...payload];
			this.draw();
		}
		// close the stream
		if (!keepOpen) {
			this.stream = false;
			this.positions = [...this.positions, ...payload];
			this.draw();
		}
	}

	draw(){
		if (!this.ctx || !this.shapeCanvas) {
			return;
		}
		// console.log("drawing ", this.positions);
		const { ctx, shapeCanvas } = this;
		ctx.save();
		ctx.clearRect(0, 0, shapeCanvas.width, shapeCanvas.height);
		ctx.lineWidth = 0.75;
		
		for (let i = 0; i < this.positions.length; i += 2) {
			const x = this.positions[i] * this.containerWidth
			const y = this.positions[i + 1] * this.containerHeight;
			// const id = this.positions[i + 2];
			ctx.setTransform(this.pxd, 0, 0, this.pxd, x/2 + shapeCanvas.width/2, -y/2 + shapeCanvas.height/2);
			ctx.fillStyle = "green";
			ctx.beginPath();
			ctx.arc(0, 0, 5, 0, 2 * Math.PI);
			ctx.fill();
		}
		ctx.restore();
	};

	debug(key: string, tex: WebGLTexture, colors: number[]) {
		if (this) {
			const { gl, quad } = this;
			if (!gl) return;
			if (colors.length > 0) {
				const vertexShaderSource = `#version 300 es
                layout(location = 0) in vec2 a_position;
                void main() {
                  gl_Position = vec4(a_position, 0.0, 1.0);
                }
                `;
				const fragmentShaderSource = `#version 300 es
                precision mediump float;
                uniform vec3 colors[${colors.length}];
                uniform mediump isampler2D ${key};
                out vec4 outColor;
                void main() {
                  ivec2 coord = ivec2(gl_FragCoord.xy);
                  ivec4 t = texelFetch(${key}, coord, 0);
                  outColor = vec4(colors[t.r], 1);
                }
                // `;

				// const uniforms = {
				// 	[key]: tex,
				// };
				// const debugProgramInfo = twgl.createProgramInfo(gl, [vertexShaderSource, fragmentShaderSource], {
				// 	attribLocations: {
				// 		a_position: 0,
				// 	},
				// });

				// const debugBufferArrays: twgl.Arrays = {
				// 	a_position: {
				// 		numComponents: 2,
				// 		data: quad,
				// 		drawType: gl.STATIC_DRAW,
				// 	},
				// };
				// const debugBufferInto = twgl.createBufferInfoFromArrays(gl, debugBufferArrays);

				// gl.useProgram(debugProgramInfo.program);
				// twgl.setBuffersAndAttributes(gl, debugProgramInfo, debugBufferInto);
				// const arrayUniform = gl.getUniformLocation(debugProgramInfo.program, "colors");
				// gl.uniform3fv(arrayUniform, new Float32Array(colors));
				// gl.clearColor(-1, 0, 0, 0);
				// gl.clear(gl.COLOR_BUFFER_BIT);
				// twgl.setUniforms(debugProgramInfo, uniforms);
				// gl.drawArrays(gl.TRIANGLES, 0, quad.length / 2);
			}
		}
	}
}

Comlink.expose(ShapeWorker);
export { ShapeWorker };
