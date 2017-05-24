'use strict';
var MACROUTILS = require( 'osg/Utils' );
var ShaderUtils = require( 'osgShader/utils' );
var Node = require( 'osgShader/node/Node' );

var ShadowReceive = function () {
    Node.call( this );

};

MACROUTILS.createPrototypeObject( ShadowReceive, MACROUTILS.objectInherit( Node.prototype, {
    type: 'ShadowReceiveNode',

    validInputs: [
        'lighted',
        'shadowTexture',
        //'shadowTextureMapSize',
        'shadowTextureRenderSize',
        'shadowTextureProjectionMatrix',
        'shadowTextureViewMatrix',
        'shadowTextureDepthRange',
        'normalWorld',
        'vertexWorld',
        'shadowBias'
        // 'shadowNormalBias'
    ],
    validOutputs: [ 'float' /*, 'outDistance'*/ ],

    globalFunctionDeclaration: function () {
        return '#pragma include "shadowsReceive.glsl"';
    },

    setShadowAttribute: function ( shadowAttr ) {
        this._shadow = shadowAttr;
        return this;
    },

    // must return an array of defines
    // because it will be passed to the ShaderGenerator
    getDefines: function () {
        var defines = this._shadow.getDefines();
        if ( this._outputs.outDistance ) defines.push( '#define _OUT_DISTANCE' );
        return defines;
    },

    getExtensions: function () {
        return [ '#extension GL_OES_standard_derivatives : enable' ];
    },

    computeShader: function () {

        var inp = this._inputs;

        // common inputs
        var inputs = [
            inp.lighted,
            inp.shadowTexture
        ];

        if ( inp.shadowTextureMapSize ) {
            inputs.push( inp.shadowTextureMapSize );
        }

        inputs = inputs.concat( [
            inp.shadowTextureRenderSize,
            inp.shadowTextureProjectionMatrix,
            inp.shadowTextureViewMatrix,
            inp.shadowTextureDepthRange,
            inp.normalWorld,
            inp.vertexWorld,
            inp.shadowBias
        ] );

        if ( inp.shadowNormalBias ) {
            inputs.push( inp.shadowNormalBias );
        }

        if ( this._outputs.outDistance ) {
            inputs.push( this._outputs.outDistance );
        }

        return ShaderUtils.callFunction( 'computeShadow', this._outputs.float, inputs );
    }

} ), 'osgShader', 'ShadowReceive' );

module.exports = {
    ShadowReceive: ShadowReceive
};
