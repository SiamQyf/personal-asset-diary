// Minimal plugin host stub — preserving folder creation/storage logic only
// Full plugin logic was intentionally removed. You'll re-describe desired
// behavior and I'll implement it based on your specification.

figma.showUI(__html__, { width: 340, height: 700, title: 'Assets Diary' });

const DRIVE_SETTINGS_STORAGE_KEY = 'assets-diary-drive-settings';
const FIXED_DRIVE_FOLDER_ID = '1a2bFDQ9TsLEfxVFX4AvDwW31NwI31WuT';
let footerFolders = [];
let driveConfig = {
  folderId: FIXED_DRIVE_FOLDER_ID,
  token: null,
  refreshToken: null,
  clientId: null,
  clientSecret: null,
  tokenExpiresAt: 0,
  indexFileId: null,
  rememberDriveSettings: false,
  rememberToken: false,
  rememberRefreshToken: false,
  rememberClientId: false,
  rememberClientSecret: false
};


// Key used to store a small sample of SVG import failures for debugging
const SVG_IMPORT_FAILURES_KEY = 'svg-import-failures';

async function recordSvgFailure(svgMarkup, reason) {
  try {
    const existing = (await figma.clientStorage.getAsync(SVG_IMPORT_FAILURES_KEY)) || [];
    existing.push({ svg: typeof svgMarkup === 'string' ? svgMarkup : String(svgMarkup), reason: reason || '', date: new Date().toISOString() });
    // Keep only the most recent 20 failures to avoid unbounded storage
    if (existing.length > 20) existing.splice(0, existing.length - 20);
    await figma.clientStorage.setAsync(SVG_IMPORT_FAILURES_KEY, existing);
    // Notify the UI so the user can inspect failures quickly
    try { figma.ui.postMessage({ type: 'svg-import-failure', reason: reason || '', sample: (svgMarkup || '').slice(0, 1024) }); } catch (e) {}
  } catch (e) {}
}

function clearSvgNodeStrokes(node) {
  if (!node) return;
  try {
    const fills = node.fills;
    const hasVisibleFill = Array.isArray(fills) && fills.some(f => f.visible !== false && f.type !== 'IMAGE');
    if (hasVisibleFill) {
      if (node.strokes !== undefined) node.strokes = [];
      if (node.strokeWeight !== undefined) node.strokeWeight = 0;
    }
  } catch (e) {}
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      clearSvgNodeStrokes(child);
    }
  }
}
async function saveDriveSettings() {
  const stored = {
    driveConfig: {
      folderId: driveConfig.folderId,
      token: driveConfig.rememberDriveSettings && driveConfig.rememberToken ? driveConfig.token : null,
      refreshToken: driveConfig.rememberDriveSettings && driveConfig.rememberRefreshToken ? driveConfig.refreshToken : null,
      clientId: driveConfig.rememberDriveSettings && driveConfig.rememberClientId ? driveConfig.clientId : null,
      clientSecret: driveConfig.rememberDriveSettings && driveConfig.rememberClientSecret ? driveConfig.clientSecret : null,
      tokenExpiresAt: driveConfig.rememberDriveSettings ? driveConfig.tokenExpiresAt : null,
      rememberDriveSettings: driveConfig.rememberDriveSettings,
      rememberToken: driveConfig.rememberToken,
      rememberRefreshToken: driveConfig.rememberRefreshToken,
      rememberClientId: driveConfig.rememberClientId,
      rememberClientSecret: driveConfig.rememberClientSecret,
      indexFileId: driveConfig.indexFileId || null
    }
  };
  await figma.clientStorage.setAsync(DRIVE_SETTINGS_STORAGE_KEY, stored);
}

function getFolderById(folderId) {
  return footerFolders.find(f => f.folderId === folderId);
}

function getStyle(folderId, styleId) {
  const folder = getFolderById(folderId);
  if (!folder || !folder.styles) {
    return null;
  }
  return folder.styles.find(function (s) {
    return s.styleId === styleId;
  });
}

function getSelectedFrameInfo() {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return null;
  const node = selection[0];
  if (node.type !== 'FRAME' && node.type !== 'GROUP') return null;
  return {
    name: node.name,
    width: node.width,
    height: node.height,
    nodeId: node.id,
    type: node.type
  };
}

function getSelectedFramesInfo() {
  const selection = figma.currentPage.selection;
  if (selection.length === 0) return [];
  const frames = [];
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      frames.push({
        name: node.name,
        width: node.width,
        height: node.height,
        nodeId: node.id,
        type: node.type,
        node: node
      });
    }
  }
  return frames;
}

// Serialize entire node tree to JSON for faithful restoration
async function serializeNode(node, depth = 0) {
  if (depth > 50) return null; // Prevent infinite recursion
  
  const data = {
    type: node.type,
    name: node.name,
    visible: node.visible,
    locked: node.locked,
    opacity: node.opacity,
    blendMode: node.blendMode,
    rotation: node.rotation,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
  };

  // Preserve rounded corners for frames/rectangles
  if (node.cornerRadius !== undefined) {
    data.cornerRadius = node.cornerRadius;
  }
  if (node.topLeftRadius !== undefined) {
    data.topLeftRadius = node.topLeftRadius;
  }
  if (node.topRightRadius !== undefined) {
    data.topRightRadius = node.topRightRadius;
  }
  if (node.bottomRightRadius !== undefined) {
    data.bottomRightRadius = node.bottomRightRadius;
  }
  if (node.bottomLeftRadius !== undefined) {
    data.bottomLeftRadius = node.bottomLeftRadius;
  }
  if (node.cornerSmoothing !== undefined) {
    data.cornerSmoothing = node.cornerSmoothing;
  }

  // Preserve polygon/star geometry for fallback recreation
  if (node.type === 'STAR' || node.type === 'POLYGON') {
    data.pointCount = node.pointCount;
  }
  if (node.type === 'STAR') {
    data.innerRadius = node.innerRadius;
    data.outerRadius = node.outerRadius;
  }

  // Text node properties
  if (node.type === 'TEXT') {
    data.characters = node.characters;
    data.fontSize = node.fontSize;
    data.fontName = node.fontName ? { family: node.fontName.family, style: node.fontName.style } : null;
    data.textAlignHorizontal = node.textAlignHorizontal;
    data.textAlignVertical = node.textAlignVertical;
    data.textAlignVertical = node.textAlignVertical;
    data.textAutoResize = node.textAutoResize;
    data.textAutoResize = node.textAutoResize;
    data.letterSpacing = node.letterSpacing ? { value: node.letterSpacing.value, unit: node.letterSpacing.unit } : null;
    data.lineHeight = node.lineHeight ? { value: node.lineHeight.value, unit: node.lineHeight.unit } : null;
    data.paragraphSpacing = node.paragraphSpacing;
    data.paragraphIndent = node.paragraphIndent;
    data.textDecoration = node.textDecoration;
    data.textTransform = node.textTransform;
    data.textCase = node.textCase;
    data.leadingTrim = node.leadingTrim || 'CAP_HEIGHT';
    data.constraints = node.constraints ? {
      horizontal: node.constraints.horizontal,
      vertical: node.constraints.vertical
    } : null;
    data.layoutAlign = node.layoutAlign;
    data.layoutGrow = node.layoutGrow;
    data.layoutSizingHorizontal = node.layoutSizingHorizontal;
    data.layoutSizingVertical = node.layoutSizingVertical;
    data.layoutPositioning = node.layoutPositioning;
    data.resizeHeight = node.resizeHeight;
    data.resizeWidth = node.resizeWidth;
  }

  // Preserve SVG/vector geometry for vector-like nodes
  if (node.type === 'VECTOR' || node.type === 'BOOLEAN_OPERATION' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'RECTANGLE') {
    try {
      const svgBytes = await node.exportAsync({ format: 'SVG', svgOutlineText: false });
      data.svgMarkup = new TextDecoder().decode(svgBytes);
    } catch (e) {}
  }

  // Preserve legacy vector-path data too
  if (node.type === 'VECTOR') {
    data.vectorPaths = node.vectorPaths ? JSON.parse(JSON.stringify(node.vectorPaths)) : [];
    data.vectorNetwork = node.vectorNetwork ? JSON.parse(JSON.stringify(node.vectorNetwork)) : null;
  }

  // Fill properties
  if (node.fills && node.fills.length > 0) {
    data.fills = node.fills.map(f => ({
      type: f.type,
      visible: f.visible,
      opacity: f.opacity,
      blendMode: f.blendMode,
      color: f.color ? { r: f.color.r, g: f.color.g, b: f.color.b, a: f.color.a } : null,
    }));
  }

  // Stroke properties
  if (node.strokes && node.strokes.length > 0) {
    data.strokes = node.strokes.map(s => ({
      type: s.type,
      visible: s.visible,
      opacity: s.opacity,
      blendMode: s.blendMode,
      color: s.color ? { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a } : null,
      strokeWeight: s.strokeWeight,
    }));
    data.strokeWeight = node.strokeWeight;
    data.strokeAlign = node.strokeAlign;
    data.strokeCap = node.strokeCap;
    data.strokeJoin = node.strokeJoin;
  }

  // Effects
  if (node.effects && node.effects.length > 0) {
    data.effects = node.effects.map(e => ({
      type: e.type,
      visible: e.visible,
      blendMode: e.blendMode,
      offset: e.offset ? { x: e.offset.x, y: e.offset.y } : null,
      radius: e.radius,
      spread: e.spread,
      color: e.color ? { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a } : null,
      showShadowBehind: e.showShadowBehind,
    }));
  }

  // Frame/Group/Boolean operation specific
  if (node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'BOOLEAN_OPERATION') {
    data.layoutMode = (node.type === 'FRAME') ? node.layoutMode : 'NONE';
    data.clipsContent = (node.type === 'FRAME') ? node.clipsContent : false;
    data.itemSpacing = (node.type === 'FRAME') ? node.itemSpacing : 0;
    data.paddingLeft = (node.type === 'FRAME') ? node.paddingLeft : 0;
    data.paddingRight = (node.type === 'FRAME') ? node.paddingRight : 0;
    data.paddingTop = (node.type === 'FRAME') ? node.paddingTop : 0;
    data.paddingBottom = (node.type === 'FRAME') ? node.paddingBottom : 0;
    data.counterAxisSpacing = (node.type === 'FRAME') ? node.counterAxisSpacing : 0;
    data.primaryAxisAlignItems = (node.type === 'FRAME') ? node.primaryAxisAlignItems : 'MIN';
    data.counterAxisAlignItems = (node.type === 'FRAME') ? node.counterAxisAlignItems : 'MIN';
    data.primaryAxisSizingMode = (node.type === 'FRAME') ? node.primaryAxisSizingMode : 'FIXED';
    data.counterAxisSizingMode = (node.type === 'FRAME') ? node.counterAxisSizingMode : 'FIXED';
    if (node.type === 'BOOLEAN_OPERATION') {
      data.booleanOperation = node.booleanOperation;
    }

    // Serialize children
    if (node.children && node.children.length > 0) {
      data.children = [];
      for (const child of node.children) {
        const childData = await serializeNode(child, depth + 1);
        if (childData) data.children.push(childData);
      }
      // If this is a GROUP composed only of vector-like children, build a combined SVG
      if (node.type === 'GROUP') {
        try {
          const vectorLike = ['VECTOR','RECTANGLE','ELLIPSE','POLYGON','STAR','BOOLEAN_OPERATION'];
          const onlyVectors = node.children.every(c => vectorLike.includes(c.type));
          if (onlyVectors) {
            const parts = [];
            for (const child of node.children) {
              try {
                const svgBytes = await child.exportAsync({ format: 'SVG', svgOutlineText: false });
                let markup = new TextDecoder().decode(svgBytes);
                // strip outer <svg> wrapper
                markup = markup.replace(/^[\s\S]*?<svg[^>]*>/i, '');
                markup = markup.replace(/<\/svg>[\s\S]*$/i, '');
                // wrap with translation so children keep their positions inside group
                // child.x/y are already relative to the group's origin, so use them directly
                const dx = typeof child.x === 'number' ? child.x : 0;
                const dy = typeof child.y === 'number' ? child.y : 0;
                parts.push(`<g transform="translate(${dx},${dy})">${markup}</g>`);
              } catch (e) {
                // skip individual child failures
              }
            }
            if (parts.length > 0) {
              const rootSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${node.width}" height="${node.height}" viewBox="0 0 ${node.width} ${node.height}">` + parts.join('') + `</svg>`;
              data.svgMarkup = rootSvg;
            }
          } else {
            // fallback: try to export the whole group as SVG
            try {
              const svgBytes = await node.exportAsync({ format: 'SVG', svgOutlineText: false });
              data.svgMarkup = new TextDecoder().decode(svgBytes);
            } catch (e) {}
          }
        } catch (e) {}
      }
    }
  }

  return data;
}

function applyTextNodeProperties(node, data) {
  if (!node || node.type !== 'TEXT' || !data || !data.characters) return;

  try {
    if (data.fontSize) node.fontSize = data.fontSize;
    if (data.fontName) node.fontName = data.fontName;
    if (data.textAlignHorizontal) node.textAlignHorizontal = data.textAlignHorizontal;
    if (data.textAlignVertical !== undefined) node.textAlignVertical = data.textAlignVertical;
    if (data.textAutoResize !== undefined) node.textAutoResize = data.textAutoResize;
    if (data.letterSpacing) node.letterSpacing = data.letterSpacing;
    if (data.lineHeight) node.lineHeight = data.lineHeight;
    if (data.paragraphSpacing !== undefined) node.paragraphSpacing = data.paragraphSpacing;
    if (data.paragraphIndent !== undefined) node.paragraphIndent = data.paragraphIndent;
    if (data.textDecoration !== undefined) node.textDecoration = data.textDecoration;
    if (data.textTransform !== undefined) node.textTransform = data.textTransform;
    if (data.textCase !== undefined) node.textCase = data.textCase;
    node.leadingTrim = 'CAP_HEIGHT';
    if (data.constraints) {
      node.constraints = data.constraints;
    }
    if (data.layoutAlign !== undefined) node.layoutAlign = data.layoutAlign;
    if (data.layoutGrow !== undefined) node.layoutGrow = data.layoutGrow;
    if (data.layoutSizingHorizontal !== undefined) node.layoutSizingHorizontal = data.layoutSizingHorizontal;
    if (data.layoutSizingVertical !== undefined) node.layoutSizingVertical = data.layoutSizingVertical;
    if (data.layoutPositioning !== undefined) node.layoutPositioning = data.layoutPositioning;
    if (data.resizeHeight !== undefined) node.resizeHeight = data.resizeHeight;
    if (data.resizeWidth !== undefined) node.resizeWidth = data.resizeWidth;
    if (data.width !== undefined && data.height !== undefined) {
      node.resize(data.width, data.height);
    }
  } catch (e) {}
}

// Recreate node tree from serialized JSON
async function deserializeNode(data, parent = null) {
  if (!data || !data.type) return null;

  let node;
  let childrenData = data.children || [];
  let importedFromSvg = false;

  // For GROUP nodes, attempt to restore the full exported SVG first, then fall back to recreating children.
  if (data.type === 'GROUP') {
    if (data.svgMarkup) {
      try {
        const importedNode = figma.createNodeFromSvg(data.svgMarkup);
        if (importedNode) {
          node = importedNode;
          importedFromSvg = true;
        }
      } catch (e) {
        // If group SVG import fails, we'll reconstruct from children below.
        try { await recordSvgFailure(data.svgMarkup, e && e.message ? e.message : String(e)); } catch (er) {}
        node = null;
      }
    }

    if (!node) {
      const children = [];
      
      // Create child nodes first
      if (childrenData.length > 0) {
        for (const childData of childrenData) {
          const child = await deserializeNode(childData, null);
          if (child) children.push(child);
        }
      }

      // Group the children, or create a frame if no children
      if (children.length > 0) {
        node = figma.group(children, figma.currentPage);
      } else {
        // Create as frame if no children to avoid group() error
        node = figma.createFrame();
      }
    }
  } else {
    // Create node based on type
    if (data.type === 'FRAME') {
      node = figma.createFrame();
    } else if (data.type === 'TEXT') {
      node = figma.createText();
    } else if (data.type === 'RECTANGLE') {
      node = figma.createRectangle();
    } else if (data.type === 'ELLIPSE') {
      node = figma.createEllipse();
    } else if (data.type === 'POLYGON') {
      node = figma.createPolygon();
    } else if (data.type === 'STAR') {
      node = figma.createStar();
    } else if (data.type === 'VECTOR' || data.type === 'BOOLEAN_OPERATION' || data.type === 'ELLIPSE' || data.type === 'POLYGON' || data.type === 'STAR' || data.type === 'RECTANGLE') {
      if (data.svgMarkup) {
        try {
          let importedNode = figma.createNodeFromSvg(data.svgMarkup);
          const vectorLikeTypes = ['VECTOR','RECTANGLE','ELLIPSE','POLYGON','STAR','BOOLEAN_OPERATION'];
          if (importedNode && importedNode.children && importedNode.children.length === 1 && vectorLikeTypes.includes(importedNode.children[0].type) && data.type !== 'GROUP') {
            if (importedNode.type === 'GROUP' || importedNode.type === 'FRAME' || importedNode.type === 'SECTION' || importedNode.type === 'COMPONENT') {
              importedNode = importedNode.children[0];
            }
          }
          const shapeMatchesType = importedNode && (
            importedNode.type === data.type ||
            (data.type === 'VECTOR' && vectorLikeTypes.includes(importedNode.type)) ||
            (importedNode.type === 'VECTOR' && vectorLikeTypes.includes(data.type)) ||
            (data.type === 'GROUP' && importedNode.type === 'GROUP')
          );
          if (shapeMatchesType) {
            node = importedNode;
            importedFromSvg = true;
          } else {
            const mismatchType = importedNode ? importedNode.type : 'unknown';
            try { importedNode.remove(); } catch (e) {}
            await recordSvgFailure(data.svgMarkup, `mismatch: expected ${data.type} got ${mismatchType}`);
            node = null;
          }
        } catch (e) {
          // Record the exact SVG and error for offline analysis
          try { await recordSvgFailure(data.svgMarkup, e && e.message ? e.message : String(e)); } catch (er) {}
          node = null;
        }
      }

      if (!node) {
        if (data.type === 'RECTANGLE') {
          node = figma.createRectangle();
        } else if (data.type === 'ELLIPSE') {
          node = figma.createEllipse();
        } else if (data.type === 'POLYGON') {
          node = figma.createPolygon();
        } else if (data.type === 'STAR') {
          node = figma.createStar();
        } else if (data.type === 'BOOLEAN_OPERATION') {
          node = figma.createBooleanOperation();
        } else {
          node = figma.createVector();
        }
      }

      if (data.type === 'STAR' && node.type === 'STAR') {
        if (data.pointCount !== undefined) node.pointCount = data.pointCount;
        if (data.innerRadius !== undefined) node.innerRadius = data.innerRadius;
        if (data.outerRadius !== undefined) node.outerRadius = data.outerRadius;
      }
      if (data.type === 'POLYGON' && node.type === 'POLYGON') {
        if (data.pointCount !== undefined) node.pointCount = data.pointCount;
      }

      if (node.type === 'VECTOR') {
        if (data.vectorPaths) {
          try {
            node.vectorPaths = data.vectorPaths;
          } catch (e) {}
        }
        if (data.vectorNetwork) {
          try {
            node.vectorNetwork = data.vectorNetwork;
          } catch (e) {}
        }
      }
    } else if (data.type === 'BOOLEAN_OPERATION') {
      node = figma.createBooleanOperation();
      if (data.booleanOperation) {
        node.booleanOperation = data.booleanOperation;
      }
    } else if (data.type === 'COMPONENT') {
      node = figma.createComponent();
    } else if (data.type === 'INSTANCE') {
      // Can't recreate instances, create a frame instead
      node = figma.createFrame();
    } else {
      return null;
    }

    // Recursively create children for FRAME and BOOLEAN_OPERATION nodes (not GROUP, already handled)
    if ((data.type === 'FRAME' || data.type === 'BOOLEAN_OPERATION') && childrenData.length > 0) {
      for (const childData of childrenData) {
        const child = await deserializeNode(childData, node);
        if (child) {
          node.appendChild(child);
        }
      }
    }
  }

  // Apply basic properties
  try {
    if (data.name) node.name = data.name;
    if (data.visible !== undefined) node.visible = data.visible;
    if (data.locked !== undefined) node.locked = data.locked;
    if (data.opacity !== undefined) node.opacity = Math.min(1, Math.max(0, data.opacity));
    if (data.blendMode && node.blendMode !== undefined) node.blendMode = data.blendMode;
    if (data.rotation !== undefined) node.rotation = data.rotation;
    if (data.x !== undefined && node.x !== undefined) node.x = data.x;
    if (data.y !== undefined && node.y !== undefined) node.y = data.y;
  } catch (e) {}

  // Set dimensions
  try {
    if (data.width !== undefined && data.height !== undefined) {
      node.resize(data.width, data.height);
    }
  } catch (e) {}

  // Restore rounded corner properties
  try {
    if (data.cornerRadius !== undefined && (node.type === 'FRAME' || node.type === 'RECTANGLE')) {
      node.cornerRadius = data.cornerRadius;
    }
    if (data.topLeftRadius !== undefined && node.type === 'RECTANGLE') {
      node.topLeftRadius = data.topLeftRadius;
    }
    if (data.topRightRadius !== undefined && node.type === 'RECTANGLE') {
      node.topRightRadius = data.topRightRadius;
    }
    if (data.bottomRightRadius !== undefined && node.type === 'RECTANGLE') {
      node.bottomRightRadius = data.bottomRightRadius;
    }
    if (data.bottomLeftRadius !== undefined && node.type === 'RECTANGLE') {
      node.bottomLeftRadius = data.bottomLeftRadius;
    }
    if (data.cornerSmoothing !== undefined && node.type === 'RECTANGLE') {
      node.cornerSmoothing = data.cornerSmoothing;
    }
  } catch (e) {}

  // Apply text properties
  if (node.type === 'TEXT' && data.characters) {
    try {
      await figma.loadFontAsync(data.fontName || { family: 'Roboto', style: 'Regular' });

      // Apply the saved box behavior before the text is laid out so Figma keeps
      // the original vertical trim/baseline appearance inside frames and groups.
      applyTextNodeProperties(node, data);
      node.characters = data.characters;

      if (data.width !== undefined && data.height !== undefined) {
        node.resize(data.width, data.height);
      }

      if (parent && (parent.type === 'FRAME' || parent.type === 'GROUP')) {
        node.x = data.x;
        node.y = data.y;
      }

      if (data.textAutoResize !== undefined) {
        node.textAutoResize = data.textAutoResize;
      }
      if (data.width !== undefined && data.height !== undefined) {
        node.resize(data.width, data.height);
      }
    } catch (e) {}
  }

  // Remove unwanted default strokes for restored vector-like shapes when no stroke data was serialized.
  if (!data.strokes || data.strokes.length === 0) {
    clearSvgNodeStrokes(node);
  }

  // Apply fills
  if (data.fills && data.fills.length > 0) {
    try {
      node.fills = data.fills.map(f => {
        const fill = {
          type: f.type || 'SOLID',
          visible: f.visible !== false,
          opacity: f.opacity || 1,
          blendMode: f.blendMode || 'NORMAL',
        };
        if (f.color) {
          fill.color = f.color;
        }
        return fill;
      });
    } catch (e) {}
  }

  // Apply strokes
  if (data.strokes && data.strokes.length > 0) {
    try {
      node.strokes = data.strokes.map(s => {
        const stroke = {
          type: s.type || 'SOLID',
          visible: s.visible !== false,
          opacity: s.opacity || 1,
          blendMode: s.blendMode || 'NORMAL',
        };
        if (s.color) {
          stroke.color = s.color;
        }
        return stroke;
      });
      if (data.strokeWeight) node.strokeWeight = data.strokeWeight;
      if (data.strokeAlign) node.strokeAlign = data.strokeAlign;
      if (data.strokeCap) node.strokeCap = data.strokeCap;
      if (data.strokeJoin) node.strokeJoin = data.strokeJoin;
    } catch (e) {}
  }

  // Apply effects
  if (data.effects && data.effects.length > 0) {
    try {
      node.effects = data.effects.map(e => {
        const effect = {
          type: e.type,
          visible: e.visible !== false,
          blendMode: e.blendMode || 'NORMAL',
          offset: e.offset || { x: 0, y: 0 },
          radius: e.radius || 0,
          spread: e.spread || 0,
        };
        if (e.color) effect.color = e.color;
        if (e.showShadowBehind !== undefined) effect.showShadowBehind = e.showShadowBehind;
        return effect;
      });
    } catch (e) {}
  }

  // Apply frame/group properties
  if (node.type === 'FRAME' || node.type === 'GROUP') {
    try {
      if (data.layoutMode) node.layoutMode = data.layoutMode;
      if (data.clipsContent !== undefined) node.clipsContent = data.clipsContent;
      if (data.itemSpacing !== undefined) node.itemSpacing = data.itemSpacing;
      if (data.paddingLeft !== undefined) node.paddingLeft = data.paddingLeft;
      if (data.paddingRight !== undefined) node.paddingRight = data.paddingRight;
      if (data.paddingTop !== undefined) node.paddingTop = data.paddingTop;
      if (data.paddingBottom !== undefined) node.paddingBottom = data.paddingBottom;
      if (data.counterAxisSpacing !== undefined) node.counterAxisSpacing = data.counterAxisSpacing;
      if (data.primaryAxisAlignItems) node.primaryAxisAlignItems = data.primaryAxisAlignItems;
      if (data.counterAxisAlignItems) node.counterAxisAlignItems = data.counterAxisAlignItems;
      if (data.primaryAxisSizingMode) node.primaryAxisSizingMode = data.primaryAxisSizingMode;
      if (data.counterAxisSizingMode) node.counterAxisSizingMode = data.counterAxisSizingMode;
    } catch (e) {}
  }

  return node;
}

async function loadFooterStyles() {
  try {
    const stored = await figma.clientStorage.getAsync(DRIVE_SETTINGS_STORAGE_KEY);
    if (stored && stored.driveConfig && stored.driveConfig.rememberDriveSettings) {
      driveConfig.folderId = stored.driveConfig.folderId || FIXED_DRIVE_FOLDER_ID;
      driveConfig.token = stored.driveConfig.token || null;
      driveConfig.refreshToken = stored.driveConfig.refreshToken || null;
      driveConfig.clientId = stored.driveConfig.clientId || null;
      driveConfig.clientSecret = stored.driveConfig.clientSecret || null;
      driveConfig.tokenExpiresAt = stored.driveConfig.tokenExpiresAt ? Number(stored.driveConfig.tokenExpiresAt) : 0;
      driveConfig.indexFileId = stored.driveConfig.indexFileId || null;
      driveConfig.rememberDriveSettings = true;
      driveConfig.rememberToken = !!stored.driveConfig.rememberToken;
      driveConfig.rememberRefreshToken = !!stored.driveConfig.rememberRefreshToken;
      driveConfig.rememberClientId = !!stored.driveConfig.rememberClientId;
      driveConfig.rememberClientSecret = !!stored.driveConfig.rememberClientSecret;
    }
  } catch (e) {
    // Ignore storage read errors and continue with drive config as-is.
  }

  const selectedFrame = getSelectedFrameInfo();
  footerFolders = [];
  if (driveConfig.folderId && (driveConfig.token || driveConfig.refreshToken)) {
    try {
      const idx = await driveLoadIndex();
      if (Array.isArray(idx.folders)) {
        footerFolders = idx.folders;
      }
      figma.ui.postMessage({ type: 'drive-connected', driveConfig });
    } catch (err) {
      figma.ui.postMessage({ type: 'error', message: 'Drive auto-connect failed: ' + err.message });
      footerFolders = [];
    }
  }

  figma.ui.postMessage({ type: 'style-state', folders: footerFolders, selectedFrame, selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!selectedFrame, driveConfig });
}

async function createFolder(name) {
  if (!driveConfig.folderId || !driveConfig.token) {
    throw new Error('Drive is not connected. Please connect before creating collections.');
  }
  const folderId = `folder-${Date.now()}-${Math.random()}`;
  const folder = {
    folderId,
    name: name || 'New Folder',
    archived: false,
    createdAt: new Date().toISOString(),
    styles: []
  };
  footerFolders.push(folder);
  await driveSaveIndex();
  await loadFooterStyles();
  return folder;
}

function encodeBase64(bytes) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function stringToUint8Array(str) {
  const utf8 = [];
  for (let i = 0; i < str.length; i++) {
    let charcode = str.charCodeAt(i);
    if (charcode < 0x80) {
      utf8.push(charcode);
    } else if (charcode < 0x800) {
      utf8.push(0xc0 | (charcode >> 6), 0x80 | (charcode & 0x3f));
    } else if (charcode < 0xd800 || charcode >= 0xe000) {
      utf8.push(
        0xe0 | (charcode >> 12),
        0x80 | ((charcode >> 6) & 0x3f),
        0x80 | (charcode & 0x3f)
      );
    } else {
      i++;
      const surrogate = 0x10000 + (((charcode & 0x3ff) << 10) | (str.charCodeAt(i) & 0x3ff));
      utf8.push(
        0xf0 | (surrogate >> 18),
        0x80 | ((surrogate >> 12) & 0x3f),
        0x80 | ((surrogate >> 6) & 0x3f),
        0x80 | (surrogate & 0x3f)
      );
    }
  }
  return new Uint8Array(utf8);
}

function concatUint8Arrays(arrays) {
  let totalLength = 0;
  for (let i = 0; i < arrays.length; i++) {
    totalLength += arrays[i].length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (let i = 0; i < arrays.length; i++) {
    result.set(arrays[i], offset);
    offset += arrays[i].length;
  }
  return result;
}

function buildMultipartBody(name, mimeType, bytes, parentFolderId) {
  const boundary = '----AssetsDiaryBoundary' + Date.now();
  const metadata = { name: name };
  if (parentFolderId) {
    metadata.parents = [parentFolderId];
  }
  const delimiter = '--' + boundary + '\r\n';
  const closeDelimiter = '--' + boundary + '--';
  const metadataHeaders = 'Content-Disposition: form-data; name="metadata"\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n';
  const fileHeaders = 'Content-Disposition: form-data; name="file"; filename="' + name + '"\r\nContent-Type: ' + mimeType + '\r\n\r\n';

  const body = concatUint8Arrays([
    stringToUint8Array(delimiter + metadataHeaders),
    stringToUint8Array(JSON.stringify(metadata)),
    stringToUint8Array('\r\n' + delimiter + fileHeaders),
    bytes,
    stringToUint8Array('\r\n' + closeDelimiter)
  ]);

  return { body, boundary };
}

function normalizeDriveToken(token) {
  if (!token) return '';
  token = token.trim();
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }
  return token;
}

function isDriveTokenExpired() {
  if (!driveConfig.token) return true;
  if (!driveConfig.tokenExpiresAt) return false;
  return Date.now() >= driveConfig.tokenExpiresAt;
}

async function refreshAccessToken() {
  if (!driveConfig.refreshToken || !driveConfig.clientId || !driveConfig.clientSecret) {
    throw new Error('Missing refresh credentials for Google Token endpoint. Provide client_id, client_secret, and refresh_token.');
  }

  const encode = (value) => encodeURIComponent(value).replace(/%20/g, '+');
  const body = [
    `client_id=${encode(driveConfig.clientId)}`,
    `client_secret=${encode(driveConfig.clientSecret)}`,
    `refresh_token=${encode(driveConfig.refreshToken)}`,
    `grant_type=refresh_token`
  ].join('&');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body
  });

  const json = await res.json();
  if (!res.ok || !json.access_token) {
    const details = json.error_description || json.error || JSON.stringify(json);
    throw new Error('Failed to refresh Google access token: ' + details);
  }

  driveConfig.token = json.access_token;
  driveConfig.tokenExpiresAt = Date.now() + ((json.expires_in || 3600) * 1000) - 60000;
  if (json.refresh_token) {
    driveConfig.refreshToken = json.refresh_token;
  }

  if (driveConfig.rememberDriveSettings) {
    await saveDriveSettings();
  }

  return driveConfig.token;
}

async function ensureDriveAccessToken() {
  if (!driveConfig.token) {
    if (driveConfig.refreshToken && driveConfig.clientId && driveConfig.clientSecret) {
      return await refreshAccessToken();
    }
    throw new Error('Drive access token is missing. Connect Drive with a token or provide refresh credentials.');
  }

  if (driveConfig.tokenExpiresAt && Date.now() >= driveConfig.tokenExpiresAt) {
    if (driveConfig.refreshToken && driveConfig.clientId && driveConfig.clientSecret) {
      return await refreshAccessToken();
    }
  }

  return driveConfig.token;
}

async function driveFetch(url, options = {}) {
  const token = normalizeDriveToken(await ensureDriveAccessToken());
  const headers = Object.assign({}, options.headers || {}, { 'Authorization': 'Bearer ' + token });
  const request = Object.assign({}, options, { headers });
  let res = await fetch(url, request);
  if (res.status === 401 && driveConfig.refreshToken && driveConfig.clientId && driveConfig.clientSecret) {
    await refreshAccessToken();
    const retryToken = normalizeDriveToken(driveConfig.token);
    request.headers.Authorization = 'Bearer ' + retryToken;
    res = await fetch(url, request);
  }
  return res;
}

async function driveUploadFile(name, mimeType, bytes, parentFolderId) {
  const payload = buildMultipartBody(name, mimeType, bytes, parentFolderId);
  const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
    body: payload.body
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Drive upload failed: ' + res.status + ' ' + body);
  }
  const json = await res.json();
  return json.id;
}

async function driveDeleteFile(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId), {
    method: 'DELETE'
  });
  if (!res.ok && res.status !== 404) throw new Error('Drive delete failed: ' + res.status);
}

async function driveDownloadFileBase64(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {
    method: 'GET'
  });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  const ab = await res.arrayBuffer();
  return encodeBase64(new Uint8Array(ab));
}

async function driveDownloadFileText(fileId) {
  const res = await driveFetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?alt=media', {
    method: 'GET'
  });
  if (!res.ok) throw new Error('Download failed: ' + res.status);
  return await res.text();
}

async function driveFindIndexFile(folderId) {
  const q = `name = 'assets-diary-index.json' and '${folderId}' in parents and trashed = false`;
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=1';
  const res = await driveFetch(url, { method: 'GET' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Drive list failed: ' + res.status + ' ' + body);
  }
  const json = await res.json();
  return (json.files && json.files[0]) ? json.files[0].id : null;
}

async function driveFindBackupIndexFile(folderId) {
  const q = `name = 'assets-diary-index-backup.json' and '${folderId}' in parents and trashed = false`;
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(q) + '&fields=files(id,name)&pageSize=1';
  const res = await driveFetch(url, { method: 'GET' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error('Drive list failed: ' + res.status + ' ' + body);
  }
  const json = await res.json();
  return (json.files && json.files[0]) ? json.files[0].id : null;
}

async function driveLoadIndex() {
  if (!driveConfig.folderId) throw new Error('Drive not configured');

  // Try loading the main index file first.
  try {
    const idxId = await driveFindIndexFile(driveConfig.folderId);
    if (idxId) {
      driveConfig.indexFileId = idxId;
      const text = await driveDownloadFileText(idxId);
      return JSON.parse(text || '{"folders":[] }');
    }
  } catch (err) {
    // If the primary index is corrupted or missing, we'll attempt recovery from backup.
  }

  // Fallback: load from backup index file.
  try {
    const backupId = await driveFindBackupIndexFile(driveConfig.folderId);
    if (backupId) {
      const backupText = await driveDownloadFileText(backupId);
      const backupData = JSON.parse(backupText || '{"folders":[] }');
      // Restore the primary index file if it is missing.
      await driveSaveIndex(backupData);
      return backupData;
    }
  } catch (err) {
    // Ignore backup load failures and continue with empty default.
  }

  driveConfig.indexFileId = null;
  return { folders: [] };
}

async function driveSaveIndex(overrideData) {
  if (!driveConfig.folderId) throw new Error('Drive not configured');
  const indexData = overrideData || { folders: footerFolders };
  const data = JSON.stringify(indexData);
  const bytes = stringToUint8Array(data);

  if (driveConfig.indexFileId) {
    try {
      const payload = buildMultipartBody('assets-diary-index.json', 'application/json; charset=UTF-8', bytes);
      const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(driveConfig.indexFileId) + '?uploadType=multipart', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'multipart/related; boundary=' + payload.boundary
        },
        body: payload.body
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error('Drive index update failed: ' + res.status + ' ' + body);
      }
    } catch (err) {
      // If the primary index file is gone or broken, clear the ID and recreate it.
      driveConfig.indexFileId = null;
    }
  }

  if (!driveConfig.indexFileId) {
    const payload = buildMultipartBody('assets-diary-index.json', 'application/json; charset=UTF-8', bytes, driveConfig.folderId);
    const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/related; boundary=' + payload.boundary
      },
      body: payload.body
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error('Drive index create failed: ' + res.status + ' ' + body);
    }
    const json = await res.json();
    driveConfig.indexFileId = json.id;
  }

  // Always save a backup copy for recovery if the main index gets lost.
  try {
    const backupBytes = stringToUint8Array(data);
    const backupId = await driveFindBackupIndexFile(driveConfig.folderId);
    const payload = buildMultipartBody('assets-diary-index-backup.json', 'application/json; charset=UTF-8', backupBytes, driveConfig.folderId);
    if (backupId) {
      const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files/' + encodeURIComponent(backupId) + '?uploadType=multipart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
        body: payload.body
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error('Drive backup index update failed: ' + res.status + ' ' + body);
      }
    } else {
      const res = await driveFetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/related; boundary=' + payload.boundary },
        body: payload.body
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error('Drive backup index create failed: ' + res.status + ' ' + body);
      }
    }
  } catch (e) {
    // Don't block the main save if backup fails.
  }
}

async function saveSelectedFrameAsStyle(folderId) {
  if (!driveConfig.folderId) {
    throw new Error('Drive is not connected. Please connect before saving a footer.');
  }
  const folder = getFolderById(folderId);
  if (!folder) throw new Error('Folder not found');

  const selection = figma.currentPage.selection;
  if (selection.length !== 1) throw new Error('Please select a single frame or group first.');
  const node = selection[0];
  if (node.type !== 'FRAME' && node.type !== 'GROUP') throw new Error('Please select a frame or group to capture.');

  const styleId = `style-${Date.now()}-${Math.random()}`;
  
  // Serialize the entire node tree
  const serializedNode = await serializeNode(node);
  
  const newStyle = {
    styleId,
    title: node.name || 'Captured Frame',
    createdAt: new Date().toISOString(),
    width: node.width,
    height: node.height,
    nodeData: serializedNode // Store complete node structure
  };

  folder.styles = folder.styles || [];
  folder.styles.unshift(newStyle);

  try {
    // Store node structure as JSON
    const nodeDataJson = JSON.stringify(serializedNode);
    const nodeDataBytes = stringToUint8Array(nodeDataJson);
    const nodeFileId = await driveUploadFile(newStyle.styleId + '.json', 'application/json', nodeDataBytes, driveConfig.folderId);
    newStyle.driveNodeFileId = nodeFileId;
    
      // If a combined SVG was produced for the node (e.g., GROUP of vectors), store it as well
      if (serializedNode && serializedNode.svgMarkup) {
        try {
          const svgBytes = stringToUint8Array(serializedNode.svgMarkup);
          const svgFileId = await driveUploadFile(newStyle.styleId + '.svg', 'image/svg+xml', svgBytes, driveConfig.folderId);
          newStyle.driveSvgFileId = svgFileId;
        } catch (e) {}
      }

    // Also store PNG for preview
    const pngBytes = await node.exportAsync({ format: 'PNG' });
    const pngFileId = await driveUploadFile(newStyle.styleId + '.png', 'image/png', pngBytes, driveConfig.folderId);
    newStyle.drivePngFileId = pngFileId;
    
    await driveSaveIndex();
    await loadFooterStyles();
    figma.ui.postMessage({ type: 'code-generated' });
  } catch (err) {
    throw new Error('Drive save failed: ' + err.message);
  }
}

async function saveSelectedFramesAsStyles(folderId) {
  if (!driveConfig.folderId) {
    throw new Error('Drive is not connected. Please connect before saving footers.');
  }
  const folder = getFolderById(folderId);
  if (!folder) throw new Error('Folder not found');

  const selection = figma.currentPage.selection;
  if (selection.length === 0) throw new Error('Please select one or more frames or groups first.');

  const framesToSave = [];
  for (const node of selection) {
    if (node.type === 'FRAME' || node.type === 'GROUP') {
      framesToSave.push(node);
    }
  }

  if (framesToSave.length === 0) throw new Error('Please select one or more frames or groups to capture.');

  try {
    for (let i = 0; i < framesToSave.length; i++) {
      const node = framesToSave[i];
      const styleId = `style-${Date.now()}-${Math.random()}`;
      
      // Serialize the entire node tree
      const serializedNode = await serializeNode(node);
      
      const newStyle = {
        styleId,
        title: node.name || `Captured Frame ${i + 1}`,
        createdAt: new Date().toISOString(),
        width: node.width,
        height: node.height,
        nodeData: serializedNode // Store complete node structure
      };

      folder.styles = folder.styles || [];
      folder.styles.unshift(newStyle);

      // Store node structure as JSON
      const nodeDataJson = JSON.stringify(serializedNode);
      const nodeDataBytes = stringToUint8Array(nodeDataJson);
      const nodeFileId = await driveUploadFile(newStyle.styleId + '.json', 'application/json', nodeDataBytes, driveConfig.folderId);
      newStyle.driveNodeFileId = nodeFileId;
      
      // Also store PNG for preview
      const pngBytes = await node.exportAsync({ format: 'PNG' });
      const pngFileId = await driveUploadFile(newStyle.styleId + '.png', 'image/png', pngBytes, driveConfig.folderId);
      newStyle.drivePngFileId = pngFileId;

      // If a combined SVG was produced for the node (e.g., GROUP of vectors), store it as well
      if (serializedNode && serializedNode.svgMarkup) {
        try {
          const svgBytes = stringToUint8Array(serializedNode.svgMarkup);
          const svgFileId = await driveUploadFile(newStyle.styleId + '.svg', 'image/svg+xml', svgBytes, driveConfig.folderId);
          newStyle.driveSvgFileId = svgFileId;
        } catch (e) {}
      }

      figma.ui.postMessage({ type: 'save-progress', current: i + 1, total: framesToSave.length, frameName: node.name });
    }

    await driveSaveIndex();
    await loadFooterStyles();
    figma.ui.postMessage({ type: 'code-generated', message: `Successfully saved ${framesToSave.length} frame(s)` });
  } catch (err) {
    throw new Error('Drive save failed: ' + err.message);
  }
}

async function deleteFooterStyle(folderId, styleId) {
  if (!driveConfig.folderId) {
    throw new Error('Drive is not connected. Please connect before deleting a footer.');
  }
  const folder = getFolderById(folderId);
  if (!folder || !folder.styles) return;
  const idx = folder.styles.findIndex(s => s.styleId === styleId);
  if (idx !== -1) {
    const style = folder.styles[idx];
    folder.styles.splice(idx, 1);
    
    // Delete JSON node file
    if (style.driveNodeFileId) {
      try {
        await driveDeleteFile(style.driveNodeFileId);
      } catch (e) {}
    }
    
    // Delete PNG preview file
    if (style.drivePngFileId) {
      try {
        await driveDeleteFile(style.drivePngFileId);
      } catch (e) {}
    }
    
    // Delete old SVG files if they exist (for backwards compatibility)
    if (style.driveSvgFileId) {
      try {
        await driveDeleteFile(style.driveSvgFileId);
      } catch (e) {}
    }
    
    await driveSaveIndex();
    await loadFooterStyles();
  }
}

async function previewStyle(folderId, styleId) {
  const style = getStyle(folderId, styleId);
  if (!style) return;
  if (!driveConfig.folderId) return;
  if (!style.drivePngFileId) return;
  try {
    const data = await driveDownloadFileBase64(style.drivePngFileId);
    figma.ui.postMessage({ type: 'preview', styleId, data });
  } catch (err) {
    // ignore preview failures
  }
}

async function generateSavedCapture(folderId, styleId) {
  const style = getStyle(folderId, styleId);
  if (!style) throw new Error('Saved capture not found.');
  if (!driveConfig.folderId) throw new Error('Drive is not connected.');
  if (!style.driveNodeFileId) throw new Error('Saved capture has no node data.');
  
  try {
    // Download and parse the JSON node data
    const jsonText = await driveDownloadFileText(style.driveNodeFileId);
    const nodeData = JSON.parse(jsonText);
    
    // Recreate the node from the serialized data
    const node = await deserializeNode(nodeData);
    
    if (!node) {
      throw new Error('Failed to recreate node from data.');
    }
    
    figma.currentPage.appendChild(node);
    node.x = figma.viewport.center.x - node.width / 2;
    node.y = figma.viewport.center.y - node.height / 2;
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
    figma.ui.postMessage({ type: 'success' });
  } catch (err) {
    throw new Error('Failed to restore saved capture: ' + err.message);
  }
}

figma.ui.onmessage = async (msg) => {
  try {
    if (!msg || !msg.type) return;
    if (msg.type === 'request-styles') {
      await loadFooterStyles();
      return;
    }
    if (msg.type === 'get-svg-failures') {
      try {
        const failures = (await figma.clientStorage.getAsync(SVG_IMPORT_FAILURES_KEY)) || [];
        figma.ui.postMessage({ type: 'svg-failures-list', failures });
      } catch (e) {
        figma.ui.postMessage({ type: 'svg-failures-list', failures: [] });
      }
      return;
    }
    if (msg.type === 'create-folder') {
      await createFolder(msg.name || 'New Folder');
      return;
    }
    if (msg.type === 'delete-folder') {
      const id = msg.folderId;
      const idx = footerFolders.findIndex(f => f.folderId === id);
      if (idx !== -1) {
        footerFolders.splice(idx, 1);
        if (!driveConfig.folderId || !driveConfig.token) throw new Error('Drive is not connected.');
        await driveSaveIndex();
      }
      await loadFooterStyles();
      return;
    }
    if (msg.type === 'archive-folder') {
      const id = msg.folderId;
      const folder = getFolderById(id);
      if (folder) {
        folder.archived = !!msg.archived;
        if (!driveConfig.folderId || !driveConfig.token) throw new Error('Drive is not connected.');
        await driveSaveIndex();
      }
      await loadFooterStyles();
      return;
    }
    if (msg.type === 'rename-folder') {
      const id = msg.folderId;
      const newName = msg.newName || '';
      const folder = getFolderById(id);
      if (folder) {
        folder.name = newName || folder.name;
        if (!driveConfig.folderId || !driveConfig.token) throw new Error('Drive is not connected.');
        await driveSaveIndex();
      }
      await loadFooterStyles();
      return;
    }
    if (msg.type === 'add-selected-footer') {
      if (msg.driveToken) {
        driveConfig.token = normalizeDriveToken(msg.driveToken);
      }
      if (msg.refreshToken) {
        driveConfig.refreshToken = msg.refreshToken.trim();
      }
      if (msg.clientId) {
        driveConfig.clientId = msg.clientId.trim();
      }
      if (msg.clientSecret) {
        driveConfig.clientSecret = msg.clientSecret.trim();
      }
      driveConfig.folderId = FIXED_DRIVE_FOLDER_ID;
      await saveSelectedFrameAsStyle(msg.folderId);
      return;
    }
    if (msg.type === 'add-selected-footers') {
      if (msg.driveToken) {
        driveConfig.token = normalizeDriveToken(msg.driveToken);
      }
      if (msg.refreshToken) {
        driveConfig.refreshToken = msg.refreshToken.trim();
      }
      if (msg.clientId) {
        driveConfig.clientId = msg.clientId.trim();
      }
      if (msg.clientSecret) {
        driveConfig.clientSecret = msg.clientSecret.trim();
      }
      driveConfig.folderId = FIXED_DRIVE_FOLDER_ID;
      await saveSelectedFramesAsStyles(msg.folderId);
      return;
    }
    if (msg.type === 'connect-drive') {
      driveConfig.folderId = FIXED_DRIVE_FOLDER_ID;
      if (msg.driveToken) {
        driveConfig.token = normalizeDriveToken(msg.driveToken);
      }
      if (msg.refreshToken) {
        driveConfig.refreshToken = msg.refreshToken.trim();
      }
      if (msg.clientId) {
        driveConfig.clientId = msg.clientId.trim();
      }
      if (msg.clientSecret) {
        driveConfig.clientSecret = msg.clientSecret.trim();
      }
      driveConfig.rememberDriveSettings = !!msg.rememberDriveSettings;
      driveConfig.rememberToken = !!msg.rememberToken;
      driveConfig.rememberRefreshToken = !!msg.rememberRefreshToken;
      driveConfig.rememberClientId = !!msg.rememberClientId;
      driveConfig.rememberClientSecret = !!msg.rememberClientSecret;
      try {
        await driveLoadIndex();
        if (driveConfig.rememberDriveSettings) {
          await saveDriveSettings();
        }
        await loadFooterStyles();
        figma.ui.postMessage({ type: 'drive-connected', driveConfig });
      } catch (err) {
        figma.ui.postMessage({ type: 'error', message: String(err) });
      }
      return;
    }
    if (msg.type === 'preview') {
      await previewStyle(msg.folderId, msg.styleId);
      return;
    }
    if (msg.type === 'generate') {
      await generateSavedCapture(msg.folderId, msg.styleId);
      return;
    }
    if (msg.type === 'delete-footer-style') {
      await deleteFooterStyle(msg.folderId, msg.styleId);
      return;
    }
    figma.ui.postMessage({ type: 'error', message: 'Unhandled message type: ' + msg.type });
  } catch (err) {
    figma.ui.postMessage({ type: 'error', message: String(err) });
  }
};

// Keep selection state updated while the UI is open.
figma.on('selectionchange', () => {
  figma.ui.postMessage({ type: 'style-state', folders: footerFolders, selectedFrame: getSelectedFrameInfo(), selectedFrames: getSelectedFramesInfo(), canAddSelectedFrame: !!getSelectedFrameInfo() });
});

// Initialize
loadFooterStyles();
