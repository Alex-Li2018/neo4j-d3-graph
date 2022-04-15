export default class StraightArrow {
    constructor(
        startRadius,
        endRadius,
        centreDistance,
        shaftWidth,
        headWidth,
        headHeight,
        captionLayout,
    ) {
        this.length;
        this.midShaftPoint;
        this.outline;
        this.overlay;
        this.shaftLength;
        this.deflection = 0;

        this.length = centreDistance - (startRadius + endRadius);
        this.shaftLength = this.length - headHeight;

        const startArrow = startRadius;
        const endShaft = startArrow + this.shaftLength;
        const endArrow = startArrow + this.length;
        const shaftRadius = shaftWidth / 2;
        const headRadius = headWidth / 2;

        this.midShaftPoint = {
            x: startArrow + this.shaftLength / 2,
            y: 0,
        };

        // for shortCaptionLength we use textBoundingBox = text.node().getComputedTextLength(),
        this.outline = function (shortCaptionLength) {
            if (captionLayout === 'external') {
                const startBreak = startArrow + (this.shaftLength - shortCaptionLength) / 2;
                const endBreak = endShaft - (this.shaftLength - shortCaptionLength) / 2;

                return [
                    'M',
                    startArrow,
                    shaftRadius,
                    'L',
                    startBreak,
                    shaftRadius,
                    'L',
                    startBreak,
                    -shaftRadius,
                    'L',
                    startArrow,
                    -shaftRadius,
                    'Z',
                    'M',
                    endBreak,
                    shaftRadius,
                    'L',
                    endShaft,
                    shaftRadius,
                    'L',
                    endShaft,
                    headRadius,
                    'L',
                    endArrow,
                    0,
                    'L',
                    endShaft,
                    -headRadius,
                    'L',
                    endShaft,
                    -shaftRadius,
                    'L',
                    endBreak,
                    -shaftRadius,
                    'Z',
                ].join(' ');
            }
            return [
                'M',
                startArrow,
                shaftRadius,
                'L',
                endShaft,
                shaftRadius,
                'L',
                endShaft,
                headRadius,
                'L',
                endArrow,
                0,
                'L',
                endShaft,
                -headRadius,
                'L',
                endShaft,
                -shaftRadius,
                'L',
                startArrow,
                -shaftRadius,
                'Z',
            ].join(' ');
        };

        this.overlay = function (minWidth) {
            const radius = Math.max(minWidth / 2, shaftRadius);
            return [
                'M',
                startArrow,
                radius,
                'L',
                endArrow,
                radius,
                'L',
                endArrow,
                -radius,
                'L',
                startArrow,
                -radius,
                'Z',
            ].join(' ');
        };
    }
}