import React, { Component } from 'react';

const PADDING = 2;
const QUALITY_RATIO = 10;
const PULSE_THICKNESS = 3;
const PULSE_PERIOD = 1000;

export default class Cooldown extends Component {
  constructor(props) {
    super(props);

    this.canvasRef = React.createRef();

    this.id = undefined;

    this.startAnimation = function () {
      let ctx = this.canvasRef.current.getContext('2d');

      let size = props.size * QUALITY_RATIO;
      let padding = PADDING * QUALITY_RATIO;

      // Start with box
      ctx.beginPath();
      ctx.fillStyle = props.backgroundColor;
      ctx.rect(0, 0, size, size);
      ctx.fill();
      let start = Date.now();

      // Cancel any current animations
      if (this.id !== undefined) {
        cancelAnimationFrame(this.id);
      }

      this.id = requestAnimationFrame(
        function animate() {
          let interval = Date.now() - start;
          if (interval <= props.duration) {
            // Pie cooldown
            let progressPercentage = interval / props.duration;

            ctx.fillStyle = props.color;
            ctx.moveTo(size / 2, size / 2);
            ctx.beginPath();
            ctx.arc(
              size / 2,
              size / 2,
              size / 2 - padding,
              Math.PI * 1.5, // Start at the top
              (Math.PI * 1.5 + progressPercentage * 2 * Math.PI) %
                (2 * Math.PI),
              false
            );
            ctx.lineTo(size / 2, size / 2);
            ctx.fill();
            ctx.closePath();
          } else {
            const RADIUS = size / 2 - padding;
            let progressPercentage = (interval % PULSE_PERIOD) / PULSE_PERIOD;

            // Fill green circle
            ctx.fillStyle = props.color;
            ctx.moveTo(size / 2, size / 2);
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, RADIUS, 0, 2 * Math.PI, false);
            ctx.lineTo(size / 2, size / 2);
            ctx.fill();
            ctx.closePath();

            // Pulse rings
            ctx.strokeStyle = props.backgroundColor;

            ctx.moveTo(size / 2, size / 2);
            ctx.lineWidth = QUALITY_RATIO * PULSE_THICKNESS;
            ctx.beginPath();
            ctx.arc(
              size / 2,
              size / 2,
              Math.max(progressPercentage * RADIUS, 0),
              0,
              2 * Math.PI,
              false
            );
            ctx.stroke();
            ctx.closePath();
          }
          this.id = requestAnimationFrame(animate.bind(this));
        }.bind(this)
      );
    }.bind(this);
  }

  componentDidMount() {
    this.startAnimation();
  }

  render() {
    return (
      <div>
        <canvas
          style={{
            width: this.props.size,
            height: this.props.size,
            filter: 'blur(.6px)',
          }}
          width={this.props.size * QUALITY_RATIO}
          height={this.props.size * QUALITY_RATIO}
          ref={this.canvasRef}
        ></canvas>
      </div>
    );
  }
}
