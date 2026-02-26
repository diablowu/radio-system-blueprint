function getRotatedHandleStyle(port, rotation, defWidth, defHeight, color) {
    const pct = port.position ?? 50; 
    let rx = 0; let ry = 0;
    if (port.side === 'top') { rx = pct / 100; ry = 0; }
    else if (port.side === 'bottom') { rx = pct / 100; ry = 1; }
    else if (port.side === 'left') { rx = 0; ry = pct / 100; }
    else if (port.side === 'right') { rx = 1; ry = pct / 100; }

    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const px = (rx - 0.5) * defWidth;
    const py = (ry - 0.5) * defHeight;

    let rotPx = px * cos - py * sin;
    let rotPy = px * sin + py * cos;

    // Use Math.round to mitigate floating point issues
    rotPx = Math.round(rotPx * 10) / 10;
    rotPy = Math.round(rotPy * 10) / 10;

    const isVertical = rotation === 90 || rotation === 270;
    const outW = isVertical ? defHeight : defWidth;
    const outH = isVertical ? defWidth : defHeight;

    const finalLeft = rotPx + outW / 2 - 6;
    const finalTop = rotPy + outH / 2 - 6;

    console.log({side: port.side, pct, finalLeft, finalTop, outW, outH});
}
getRotatedHandleStyle({side: 'top', position: 50}, 90, 150, 100, 'red'); // width=150, height=100. top is at x=75, y=0. rotate 90 -> should be on right
getRotatedHandleStyle({side: 'right', position: 30}, 270, 150, 100, 'red');
