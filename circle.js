let mousedown = [false, false, false],
at = 0,
$audio; // reference for the DOMnode

const t = 60, // Approx frame rate (ms/frame)

ComponentAudioPlayer = React.createClass({
   displayName: "ComponentAudioPlayer",
  getInitialState() {
    return {
      audioReady: false,
      playerStatus: 'pause',
      progressIndicator: '',
      startTime: window.mozAnimationStartTime || Date.now(),
      timer: '0:00',
      track: 'M 0 -100 v 0 A 100 100 1 1 1 -.1 -100',
      scrubber: '' };

  },

  propTypes: {
    source: React.PropTypes.string.isRequired,
    r: React.PropTypes.number,
    viewBox: React.PropTypes.string },


  getDefaultProps() {
    return {
      source: '',
      r: 100, // radius of player
      viewBox: '-125 -125 250 250' };

  },

  componentDidMount() {
    const playReady = () => {
      this.setState({ audioReady: true });
    };

    $audio = this.refs.audio;

    $audio.addEventListener('canplaythrough', playReady);

    $audio.addEventListener('loadedmetadata', this.setTimer);

    $audio.addEventListener('ended', this.reset);

    window.addEventListener('mouseup', function (e) {
      mousedown[e.button] = false;
    });

  },

  animate() {
    const drawStart = Date.now();

    let diff = drawStart - this.state.startTime;

    if (this.state.playerStatus !== 'pause' && at < 2 * Math.PI) {
      if (diff <= t) {
        let theta = 2 * Math.PI * (diff / 1000) / $audio.duration;

        at += theta || 0;
        this.drawArc(at, this.props.r, 'progress');
        this.setState({ startTime: drawStart });
        this.setState({ timer: `${this.formatSeconds($audio.currentTime)}` });

        return window.requestAnimationFrame(this.animate);
      }

      return this.setState({ startTime: '' });
    }
  },
  /**
   * arcAngle()
   *
   * @param
   * @returns
   */
  arcAngle(x, y, deg) {
    const radius = Math.sqrt(x * x + y * y),
    deltaY = y + radius;

    let theta = Math.acos(1 - (x * x + deltaY * deltaY) / (2 * radius * radius));

    if (x < 0) {
      theta = 2 * Math.PI - theta;
    }

    // theta measured in radians.
    return deg ? theta * (180 / Math.PI) : theta;
  },

  drawArc(theta, r, el) {
    const zero = 1e-10;

    let largeArcFlag = theta > Math.PI ? 1 : 0, // Are we going around the long way (1) or the short way (0)
    sweepFlag = theta < 2 * Math.PI ? 1 : 0, // Following a negative angle (0) or a positive one (1)

    x = r * Math.sin(theta); // Where along the x-axis the arc endpoint is

    if (Math.abs(x) <= zero) {x = 0;}

    let y = -(r * Math.cos(theta)); // Where along the y-axis the arc endpoint is

    const d = `M 0 -${r} v 0 A ${r} ${r} 1 ${largeArcFlag} ${sweepFlag} ${x} ${y}`;

    if (el === 'scrubber') {
      return this.setState({ scrubber: d });
    }

    return this.setState({ progressIndicator: d });
  },

  formatSeconds(time) {
    const mins = Math.floor(time / 60);

    let secs = (time - mins * 60).toFixed(0);

    if (secs.toString().length < 2) {secs = `0${secs}`;}

    return `${mins}:${secs}`;
  },

  mouseEvent(evt) {
    switch (evt.type) {
      case 'mouseleave':
        this.setState({ scrubber: `M 0 -${this.props.r} v 0 A ${this.props.r} ${this.props.r} 1 1 1 0 -100` });
        break;

      case 'mousedown':
      case 'mousemove':
        if (evt.type === 'mousedown') {
          mousedown[evt.button] = true;
        }

        if (mousedown[0]) {
          let dAttr = this.state.scrubber.split(' '),
          xArcStart = 0,
          yArcStart = -this.props.r,
          xTrack = parseFloat(dAttr[dAttr.length - 2], 10),
          yTrack = parseFloat(dAttr[dAttr.length - 1], 10),
          angle = this.arcAngle(xTrack, yTrack),
          arcAsRatio = angle / (2 * Math.PI);

          this.scrubTo(arcAsRatio);
        }

        if (evt.type === 'mousemove') {
          let viewBox, translation, offsetX, offsetY, x, y, theta;

          viewBox = this.props.viewBox;
          viewBox = viewBox ? viewBox.split(' ') : [];

          translation = viewBox.slice(0, 2);
          if (translation.length !== 2) {translation = [0, 0];};

          offsetX = evt.nativeEvent.hasOwnProperty('offsetX') ? evt.offsetX : evt.nativeEvent.layerX;
          offsetY = evt.nativeEvent.hasOwnProperty('offsetY') ? evt.offsetY : evt.nativeEvent.layerY;

          x = offsetX + parseInt(translation[0], 10);
          y = offsetY + parseInt(translation[1], 10);

          theta = this.arcAngle(x, y);

          this.drawArc(theta, this.props.r, 'scrubber');
        }
        break;

      case 'mouseup':
        mousedown[e.button] = false;
        break;}


  },

  play() {
    $audio = this.refs.audio;

    if (this.props.audioReady || $audio.duration) {
      this.setState({ playerStatus: 'play' });

      $audio.play();

      this.setState({ startTime: window.mozAnimationStartTime || Date.now() });
      return window.requestAnimationFrame(this.animate);
    }
  },

  pause() {
    $audio = this.refs.audio;

    this.setState({ playerStatus: 'pause' });
    // TODO: make sure this isn't needed
    // document.querySelector( '.audioplayer-action' ).textContent = (this.state.playerStatus === 'play') ? 'pause' : 'play';

    $audio.pause();
  },

  reset() {
    $audio = this.refs.audio;
    // set the SVG for progress back to 0
    this.setState({ progressIndicator: `M 0 ${-this.props.r} v 0 A ${this.props.r} ${this.props.r} 1 0 1 .00001 -100` });
    this.setState({ playerStatus: 'pause' });

    // reset the AUDIO element
    $audio.currentTime = 0;
    at = 0;
  },

  setTimer() {
    this.setState({ timer: this.formatSeconds($audio.duration) });
  },

  scrubTo(time) {
    const $progress = this.refs.progress;

    $audio = this.refs.audio;

    $audio.currentTime = time * $audio.duration;
    at = 2 * Math.PI * time;
    this.drawArc(at, this.props.r, $progress);
  },

  togglePlay() {
    this.state.playerStatus === 'play' ? this.pause() : this.play();
  },

  render() {
    return /*#__PURE__*/(
      React.createElement("div", { ref: "player", className: "audioplayer" }, /*#__PURE__*/
      React.createElement("svg", { ref: "playerSVG", className: "audioplayer-ui audioplayer-ui--detail", preserveAspectRatio: "xMidYMid", viewBox: this.props.viewBox, draggable: "false" }, /*#__PURE__*/
      React.createElement("path", { onMouseLeave: this.mouseEvent,
        onMouseDown: this.mouseEvent,
        onMouseMove: this.mouseEvent,
        ref: "track", d: this.state.track, className: "audioplayer-indicator audioplayer-track", transform: "translate(0, 0)", draggable: "false" }), /*#__PURE__*/
      React.createElement("path", { ref: "progress", d: this.state.progressIndicator, id: "progress", className: "audioplayer-indicator audioplayer-progress", transform: "translate(0, 0)", draggable: "false" }), /*#__PURE__*/
      React.createElement("path", { ref: "scrubber", d: this.state.scrubber, className: "audioplayer-indicator audioplayer-scrubber", transform: "translate(0, 0)", draggable: "false" }), /*#__PURE__*/
      React.createElement("path", { onClick: this.togglePlay,
        ref: "playToggle", className: "audioplayer-playtoggle", d: "M 0 -100 v 0 A 100 100 1 1 1 -.1 -100", transform: "translate(0, 0) scale(.9)", draggable: "false" }), /*#__PURE__*/
      React.createElement("text", { className: "audioplayer-feedback", transform: "translate(0 15)", textAnchor: "middle" }, /*#__PURE__*/
      React.createElement("tspan", { id: "text", className: "audioplayer-timer play-pause-1", x: "4" }, this.state.timer), /*#__PURE__*/
      React.createElement("tspan", { className: "audioplayer-action play-pause-1", x: "0" }, this.state.playerStatus === 'play' ? 'pause' : 'play'))), /*#__PURE__*/


      React.createElement("audio", { ref: "audio", src: this.props.source })));


  } });


React.render( /*#__PURE__*/React.createElement(ComponentAudioPlayer, { source:"song.mp3"}), document.getElementById('audio'));
//# sourceURL=pen.js