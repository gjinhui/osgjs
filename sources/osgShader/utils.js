'use strict';
var MACROUTILS = require( 'osg/Utils' );
var Notify = require( 'osg/notify' );
var Node = require( 'osgShader/node/Node' );

var sprintf = function ( string, args ) {
    if ( !string || !args ) {
        return '';
    }

    var arg;

    for ( var index in args ) {
        arg = args[ index ];

        if ( arg === undefined ) {
            continue;
        }

        if ( arg.getVariable ) {
            arg = arg.getVariable();
        }
        string = string.replace( '%s', arg );
    }
    return string;
};


var checkVariableType = function ( vars, optionalPrefix ) {

    var inputs = vars;
    var varsList = [];
    var prefix = optionalPrefix;
    if ( optionalPrefix === undefined ) {
        prefix = '';
    }

    for ( var i = 0, l = inputs.length; i < l; i++ ) {

        var variable = inputs[ i ];
        var output;

        if ( variable === undefined ) {
            output = 'undefined';
        } else if ( typeof variable === 'string' ) {
            output = variable;
        } else if ( variable.getType ) {
            output = variable.getType() + ' ' + variable.getVariable();
        } else {
            output = variable.getVariable();
        }

        varsList.push( prefix + output );
    }

    return varsList;

};


// call glsl function
// generate a string with output = funcName ( inputs )
// useful when debuging to print inputs / outputs
// TODO check type of arguments with regexp in glsl
// shader function regex
// [\r\n]\s[(vec4)|(vec3)|(vec2)|(float)|(bool)|(int)].*\(.*[.|\r\n]*\).*[\r\n]*{
// doesn't handle multiline
// then split(',')
// then substring (out,in)
// then type matching
// (works by hand here.)
// for instance, gather types from input and compare themt to glsl decl
// var inputTypes = [
//             'vec4',
//             'vec4',
//             'sampler2D',
//             'vec4',
//             'vec4',
//             'vec3',
//             'float',
//             'vec3',
//             'float',
//             'float',
//             'float',
//             'float',
//             'float'
//         ];
//         console.assert( inputs.length === inputTypes.length );
//         var i = inputs.length;
//         while ( i-- ) {
//             console.assert( inputs[ i ]._type === inputTypes[ i ], inputs[ i ]._prefix );
//         }
var callFunction = function ( funcName, output, inputs ) {

    var osgShader = require( 'osgShader/osgShader' );

    var debug = [];
    var callString = '';

    // debug
    if ( osgShader.debugShaderNode ) {
        debug.push( '\n// output' );
        Array.prototype.push.apply( debug, checkVariableType( [ output ], '// ' ) );
    }

    if ( output ) {
        callString = ( output.getVariable ? output.getVariable() : output ) + ' = ';
    }

    callString = callString + funcName + '( ';

    if ( inputs && inputs.length > 0 ) {

        // debug
        if ( osgShader.debugShaderNode ) {
            debug.push( '// inputs' );
            Array.prototype.push.apply( debug, checkVariableType( inputs, '// ' ) );
        }

        for ( var i = 0, l = inputs.length; i < l; i++ ) {
            callString += inputs[ i ].getVariable ? inputs[ i ].getVariable() : inputs[ i ];
            if ( i !== l - 1 ) callString += ', ';
        }
    }

    callString += ' );\n';

    if ( osgShader.debugShaderNode ) {
        return debug.join( '\n' ) + '\n' + callString;
    }

    return callString;
};


var extractMapVariable = function ( option ) {
    var res = option.match( /([^\s]+):([^\s]+)/g );
    var map = {};
    if ( !res ) return map;
    for ( var i = 0; i < res.length; ++i ) {
        var split = res[i].split( ':' );
        map[ split[ 0 ] ] = split[ 1 ];
    }
    return map;
};

var extractSignature = function ( option, signature ) {
    var openParen = signature.indexOf( '(' );
    var closeParen = signature.indexOf( ')' );

    var preSignature = signature.substring( 0, openParen );
    preSignature = preSignature.replace( /[\r\n|\r|\n]/g, '' ).trim().replace( /\s+/g, ' ' );
    var splitPre = preSignature.split( /\s/ );
    var firstWord = splitPre[ 0 ];
    var nameFunc = splitPre[ 1 ];

    // override variable names
    var mapToVariables = extractMapVariable( option );
    var returnName = mapToVariables.result || 'result';

    // override node name
    var nodeName = option.match( /NODE_NAME:([^\s]+)/ );
    nodeName = nodeName ? nodeName[ 1 ] : ( nameFunc[ 0 ].toUpperCase() + nameFunc.substring( 1 ) );

    // extensions
    var extensions = [];
    if ( option.indexOf( 'DERIVATIVES:enable' ) !== -1 ) {
        extensions.push( '#extension GL_OES_standard_derivatives : enable' );
    }

    var outputs = [];
    var returnVariable;
    var isDefine = firstWord === '#define';
    // return variable
    if ( firstWord !== 'void' ) {
        returnVariable = {
            name: returnName,
            type: !isDefine && firstWord
        };
        outputs.push( returnVariable );
    }

    var postSignature = signature.substring( openParen + 1, closeParen );
    postSignature = postSignature.replace( /[\r\n|\r|\n]/g, '' );

    var argumentList = postSignature.split( ',' );
    var inputs = [];
    var orderedArgs = [];
    for ( var i = 0; i < argumentList.length; ++i ) {
        var argi = argumentList[i];
        if ( !argi ) continue;
        var qualifiers = argi.trim().replace( /\s+/g, ' ' ).split( '[' )[ 0 ];
        var splits = qualifiers.split( /\s/ );
        var nbSplits = splits.length;

        var isOutput = !isDefine && ( nbSplits < 3 || splits[ nbSplits - 3 ].indexOf( 'out' ) !== -1 ) ;
        var glslName = splits[ nbSplits - 1 ];
        var res = {
            isOutput: isOutput,
            type: splits[ nbSplits - 2 ],
            name: mapToVariables[ glslName ] || glslName
        };

        if ( isOutput ) outputs.push( res );
        else inputs.push( res );
        orderedArgs.push( res );
    }

    return {
        nodeName: nodeName,
        functionName: nameFunc,
        signature: {
            returnVariable: returnVariable,
            orderedArgs: orderedArgs,
            outputs: outputs,
            inputs: inputs,
            extensions: extensions
        }
    };
};

var createNode = function ( res, fileName ) {
    var NodeCustom = function () {
        Node.call( this );
    };

    var globalDeclare = '#pragma include "' + fileName + '"';
    MACROUTILS.createPrototypeObject( NodeCustom, MACROUTILS.objectInherit( Node.prototype, {

        type: res.nodeName,
        signatures: [ res.signature ],

        checkInputsOutputs: function () {},

        getExtensions: function () {
            return this.getOrCreateSignature().extensions;
        },

        globalFunctionDeclaration: function () {
            return globalDeclare;
        },

        _validateSameVariables: function ( glslArray, jsObj ) {
            var nbGlsl = glslArray.length;
            for ( var i = 0; i < nbGlsl; ++i ) {
                if ( !jsObj[ glslArray[ i ].name ] ) return false;
            }
            return glslArray.length === Object.keys( jsObj ).length;
        },

        _validateSameType: function ( glslArray, jsObj ) {
            var nbGlsl = glslArray.length;
            for ( var i = 0; i < nbGlsl; ++i ) {
                var jsVar = jsObj[ glslArray[ i ].name ];
                if ( jsVar.getType() !== glslArray[ i ].type ) return false;
            }
            return true;
        },

        _getSignatureBestMatch: function ( ) {
            if ( this.signatures.length === 1 ) return this.signatures[ 0 ];

            var matchNames = [];
            var matchOutput = [];
            var matchInput = [];
            var nbSignatures = this.signatures.length;
            for ( var i = 0; i < nbSignatures; ++i ) {
                var sig = this.signatures[ i ];
                if ( !this._validateSameVariables( sig.outputs, this._outputs ) ) continue;
                if ( !this._validateSameVariables( sig.inputs, this._inputs ) ) continue;
                matchNames.push( sig );

                if ( !this._validateSameType( sig.outputs, this._outputs ) ) continue;
                matchOutput.push( sig );

                if ( !this._validateSameType( sig.inputs, this._inputs ) ) continue;
                matchInput.push( sig );
            }

            if ( !matchNames.length ) return this.signatures[ 0 ];
            if ( matchNames.length === 1 || !matchOutput.length ) return matchNames[ 0 ];
            if ( matchOutput.length === 1 || !matchInput.length ) return matchOutput[ 0 ];
            return matchInput[ 0 ];
        },

        getOrCreateSignature: function () {
            if ( !this._signature ) this._signature = this._getSignatureBestMatch();
            return this._signature;
        },

        _typeDownCast: function ( glslArg ) {
            var validType = glslArg.type;

            var jsArg = glslArg.isOutput ? this._outputs[glslArg.name] : this._inputs[glslArg.name];
            if ( !jsArg ) {
                var typeIn = glslArg.isOutput ? 'output' : 'input';
                Notify.error( 'missing ' + typeIn + ' ' + glslArg.name + ' on NodeCustom ' + res.nodeName );
                return validType === 'float' ? '0.0' : validType + '(0.0)';
            }

            var realType = jsArg.getType();

            if ( !validType || validType === realType ) return jsArg;
            if ( validType === 'vec3' ) return jsArg.getVariable() + '.rgb';
            if ( validType === 'vec2' ) return jsArg.getVariable() + '.rg';
            if ( validType === 'float' ) return jsArg.getVariable() + '.r';
            return jsArg;
        },

        computeShader: function () {
            var signature = this.getOrCreateSignature();

            var ret = signature.returnVariable && signature.returnVariable.name;
            var returnOut = ret ? this._outputs[ ret ] : undefined;
            if ( ret && !returnOut ) {
                Notify.error( 'missing output ' + ret + ' on NodeCustom ' + res.nodeName );
            }

            var inputs = [];
            for ( var i = 0; i < signature.orderedArgs.length; ++i ) {
                inputs.push( this._typeDownCast( signature.orderedArgs[i] ) );
            }

            return callFunction( res.functionName, returnOut, inputs );
        }

    } ), 'osgShader', res.nodeName );

    return NodeCustom;
};

var extractFunctions = function ( shaderLib, fileName ) {
    var objOut = {};
    var signatures = shaderLib[ fileName ].split( /#pragma DECLARE_FUNCTION(.*)[\r\n|\r|\n]/ );
    var nbSignatures = ( signatures.length - 1 ) / 2;
    for ( var i = 0; i < nbSignatures; ++i ) {
        var result = extractSignature( signatures[ i * 2 + 1 ], signatures[ i * 2 + 2 ] );
        var shaderNode = objOut[ result.nodeName ];
        if ( shaderNode ) {
            shaderNode.prototype.signatures.push( result.signature );
        } else {
            objOut[ result.nodeName ] = createNode( result, fileName );
        }
    }

    return objOut;
};

module.exports = {
    callFunction: callFunction,
    checkVariableType: checkVariableType,
    sprintf: sprintf,
    extractFunctions: extractFunctions
};
