'use strict';
var MACROUTILS = require( 'osg/Utils' );

// Base class for GLResources: Textures, Buffers, Programs, Shaders, FrameBuffers and RenderBuffers
// It holds a reference to the graphic context that is needed for resource deletion

var GLObject = function () {
    this._gl = undefined;
};

MACROUTILS.createPrototypeObject( GLObject, {
    setGraphicContext: function ( gl ) {
        this._gl = gl;
    },
    getGraphicContext: function () {
        return this._gl;
    }
} );

module.exports = GLObject;
