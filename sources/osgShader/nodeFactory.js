'use strict';
var Notify = require( 'osg/notify' );
var data = require( 'osgShader/node/data' );
var shadows = require( 'osgShader/node/shadows' );
var operations = require( 'osgShader/node/operations' );
var shaderUtils = require( 'osgShader/utils' );
var shaderLib = require( 'osgShader/shaderLib' );
var shadowLib = require( 'osgShadow/shaderLib' );

var Factory = function () {

    this._nodes = new window.Map();

    this.extractFunctions( shaderLib, 'lights.glsl' );
    this.extractFunctions( shaderLib, 'lightCommon.glsl' );
    this.extractFunctions( shaderLib, 'skinning.glsl' );
    this.extractFunctions( shaderLib, 'morphing.glsl' );
    this.extractFunctions( shaderLib, 'billboard.glsl' );
    this.extractFunctions( shaderLib, 'functions.glsl' );
    this.extractFunctions( shaderLib, 'textures.glsl' );
    this.extractFunctions( shadowLib, 'shadowsCastFrag.glsl' );

    this.registerNodes( data );
    this.registerNodes( shadows );
    this.registerNodes( operations );
};

Factory.prototype = {

    registerNodes: function ( obj ) {
        for ( var key in obj ) {
            this.registerNode( key, obj[ key ] );
        }
    },

    registerNode: function ( name, constructor ) {

        if ( this._nodes.has( name ) ) {
            Notify.warn( 'Node ' + name + ' already registered' );
        }
        this._nodes.set( name, constructor );

    },

    extractFunctions: function ( lib, filename ) {
        this.registerNodes( shaderUtils.extractFunctions( lib, filename ) );
    },

    // extra argument are passed to the constructor of the node
    getNode: function ( name ) {

        var Constructor = this._nodes.get( name );
        if ( !Constructor ) {
            // Means either:
            // - the node isn't registered by methods above
            // - you mistyped the name
            // - Core Node has changed its Name
            Notify.warn( 'Node ' + name + ' does not exist' );
            return undefined;
        }

        // call a constructor with array arguments
        // http://www.ecma-international.org/ecma-262/5.1/#sec-13.2.2
        var instance = window.Object.create( Constructor.prototype );
        Constructor.apply( instance, Array.prototype.slice.call( arguments, 1 ) );

        return instance;
    }

};

var instance = new Factory();

module.exports = instance;
