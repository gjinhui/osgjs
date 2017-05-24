float getLightAttenuation(const in float dist, const in vec4 lightAttenuation) {
    // lightAttenuation(constantEnabled, linearEnabled, quadraticEnabled)
    // TODO find a vector alu instead of 4 scalar
    float constant = lightAttenuation.x;
    float linear = lightAttenuation.y * dist;
    float quadratic = lightAttenuation.z * dist * dist;
    return 1.0 / (constant + linear + quadratic);
}

#pragma DECLARE_FUNCTION
void precomputeSpot(
        const in vec3 normal,
        const in vec3 viewVertex,
                          
        const in vec3 lightViewDirection,
        const in vec4 lightAttenuation,
        const in vec3 lightViewPosition,
        const in float lightSpotCutOff,
        const in float lightSpotBlend,
                          
        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    attenuation = 0.0;
    if (lightSpotCutOff <= 0.0) return;

    eyeLightDir = lightViewPosition - viewVertex;
    float dist = length(eyeLightDir);

    eyeLightDir = dist > 0.0 ? eyeLightDir / dist : vec3( 0.0, 1.0, 0.0 );
    float cosCurAngle = dot(-eyeLightDir, lightViewDirection);
    if (cosCurAngle < lightSpotCutOff) return;

    float spot = 1.0;
    if (lightSpotBlend > 0.0) {
        spot = cosCurAngle * smoothstep(0.0, 1.0, (cosCurAngle - lightSpotCutOff) / lightSpotBlend);
        if (spot < 0.0) return;
    }

    dotNL = dot(eyeLightDir, normal);
    attenuation = spot * getLightAttenuation(dist, lightAttenuation);
}

#pragma DECLARE_FUNCTION
void precomputePoint(
        const in vec3 normal,
        const in vec3 viewVertex,

        const in vec4 lightAttenuation,
        const in vec3 lightViewPosition,

        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    eyeLightDir = lightViewPosition - viewVertex;
    float dist = length(eyeLightDir);

    attenuation = getLightAttenuation(dist, lightAttenuation);
    eyeLightDir = dist > 0.0 ? eyeLightDir / dist :  vec3( 0.0, 1.0, 0.0 );
    dotNL = dot(eyeLightDir, normal);
}

#pragma DECLARE_FUNCTION
void precomputeSun(
        const in vec3 normal,
        const in vec3 lightViewPosition,
  
        out float attenuation,
        out vec3 eyeLightDir,
        out float dotNL) {

    attenuation = 1.0;
    eyeLightDir = normalize(lightViewPosition);
    dotNL = dot(eyeLightDir, normal);
}