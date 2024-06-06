import { Selection, BaseType, select } from "d3-selection";
import "d3-transition";
import { timer } from "d3-timer";
import { d3EasingFunctions } from "./easings";
export class ShapeRenderer {
	shapes: { x: number; y: number; d: string; fill: string; id: string }[] = [];
	duration: number = 200;
	exitDuration: number = 0;
	customElement: HTMLElement;
	generator: (d: any) => string | null;
	draw: (() => void) | null;
	ease: (normalizedTime: number) => number = (number) => number;
	customClass = "shape";

	constructor(curstomElement: HTMLElement, generator: (d: any) => string | null, draw: (() => void) | null, customClass?: string, ease?: Easing) {
		this.customElement = curstomElement;
		this.generator = generator;
		this.draw = draw;
		if (customClass) this.customClass = customClass;
		if (ease) this.ease = d3EasingFunctions[ease];
	}

	updateShapes(shapes: { x: number; y: number; d: string; fill: string; id: string }[]) {
		// console.log("shapes updated in shapeRenderer", shapes.length);
		this.shapes = shapes;
		this.render();
	}

	extraTransition() {
		const { customElement, customClass } = this;
		const dataBinding = select(customElement)
			.selectAll<HTMLElement, { x: number; y: number; fill: string; d: string; id: string }>(`custom.${customClass}`)
			.data(this.shapes, function (d) {
				return d.id || select(this).attr("id");
			});

		this.transition(dataBinding);
	}

	render() {
		const { customElement, customClass } = this;

		const dataBinding = select(customElement)
			.selectAll<HTMLElement, { x: number; y: number; fill: string; d: string; id: string }>(`custom.${customClass}`)
			.data(this.shapes, function (d) {
				return d.id || select(this).attr("id");
			});

		dataBinding
			.exit()
			// .transition("exit")
			// .attr("opacity", 0)
			.remove();

		dataBinding
			.enter()
			.append("custom")
			.classed(customClass, true)
			.attr("id", (d) => d.id)
			.append("path")
			.attr("x", (d) => d.x)
			.attr("y", (d) => d.y)
			.attr("fill", (d) => d.fill)
			.attr("d", (d) => this.generator(d) || "")
			.attr("opacity", 0);
		setTimeout(() => {
			this.transition(dataBinding);
		}, 100);
		
	}

	private transition(selection: Selection<HTMLElement, { x: number; y: number; d: string; fill: string; id: string }, BaseType, unknown>) {
		const { draw, generator, duration, ease } = this;
		const t = timer(function (elapsed) {
			const el = Math.min(1, ease(elapsed / (duration + 100)));
			if (draw) draw();
			if (el === 1) t.stop();
		});
		// Note: This does not include a transition for the size and shape of the path.
		// That will include attTween("d", ...) and a generator function an interpolator function
		// and a current object to keep track of the current state of the path
		selection
			.select("path")
			.transition()
			.duration(duration)
			.attr("x", (d) => d.x)
			.attr("y", (d) => d.y)
			.attr("fill", (d) => d.fill)
			.attr("opacity", 1);
	}

	changeEase(ease: Easing) {
		this.ease = d3EasingFunctions[ease];
	}
}