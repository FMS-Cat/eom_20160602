import { xorshift } from './xorshift';
import { GLCat } from './glcat';

let glslify = require( 'glslify' );

// ---

let clamp = ( _value, _min, _max ) => {
  return Math.min( Math.max( _value, _min ), _max );
};

let saturate = ( _value ) => {
  return clamp( _value, 0.0, 1.0 );
};

// ---

let width = canvas.width = 300;
let height = canvas.height = 300;

let gl = canvas.getContext( 'webgl' );
let glCat = new GLCat( gl );

let frame = 0;
let frames = 100;
let iSample = 0;
let nSample = 500;
let time = 0.0;

// ---

let vboQuad = glCat.createVertexbuffer( [ -1, -1, 1, -1, -1, 1, 1, 1 ] );

// ---

let vertQuad = glslify( './shader/quad.vert' );

let programReturn = glCat.createProgram(
  vertQuad,
  glslify( './shader/return.frag' )
);

let programRaymarch = glCat.createProgram(
  vertQuad,
  glslify( './shader/raymarch.frag' )
);

let programMotionblur = glCat.createProgram(
  vertQuad,
  glslify( './shader/motionblur.frag' )
);

let programGamma = glCat.createProgram(
  vertQuad,
  glslify( './shader/gamma.frag' )
);

// ---

let framebufferRender = glCat.createFloatFramebuffer( width, height );
let framebufferMotionblur = glCat.createFloatFramebuffer( width, height );
let framebufferMotionblurReturn = glCat.createFloatFramebuffer( width, height );

// ---

let textureRandomSize = 256;
let textureRandom = glCat.createTexture();
glCat.textureWrap( textureRandom, gl.REPEAT );

let textureRandomUpdate = () => {
  glCat.setTextureFromArray( textureRandom, textureRandomSize, textureRandomSize, ( () => {
    let len = textureRandomSize * textureRandomSize * 4;
    let ret = new Uint8Array( len );
    for ( let i = 0; i < len; i ++ ) {
      ret[ i ] = Math.floor( xorshift() * 256.0 );
    }
    return ret;
  } )() );
};

// ---

let cameraPos = [ 0.0, 0.0, 3.0 ];

// ---

let renderA = document.createElement( 'a' );

let saveFrame = () => {
  renderA.href = canvas.toDataURL();
  renderA.download = ( '0000' + frame ).slice( -5 ) + '.png';
  renderA.click();
};

// ---

let render = () => {
  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programRaymarch );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferRender );
  glCat.clear();

  glCat.attribute( 'p', vboQuad, 2 );

  glCat.uniform1f( 'time', time );
  glCat.uniform2fv( 'resolution', [ width, height ] );
  glCat.uniform3fv( 'u_cameraPos', cameraPos );

  glCat.uniformTexture( 'textureRandom', textureRandom, 0 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ---

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programReturn );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferMotionblurReturn );
  glCat.clear();

  glCat.attribute( 'p', vboQuad, 2 );
  glCat.uniform2fv( 'resolution', [ width, height ] );
  glCat.uniformTexture( 'texture', framebufferMotionblur.texture, 0 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ---

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programMotionblur );
  gl.bindFramebuffer( gl.FRAMEBUFFER, framebufferMotionblur );
  glCat.clear();

  glCat.attribute( 'p', vboQuad, 2 );
  glCat.uniform1f( 'add', 1.0 / nSample );
  glCat.uniform1i( 'init', iSample === 0 );
  glCat.uniform2fv( 'resolution', [ width, height ] );
  glCat.uniformTexture( 'renderTexture', framebufferRender.texture, 0 );
  glCat.uniformTexture( 'blurTexture', framebufferMotionblurReturn.texture, 1 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );

  // ---

  gl.viewport( 0, 0, width, height );
  glCat.useProgram( programGamma );
  gl.bindFramebuffer( gl.FRAMEBUFFER, null );
  glCat.clear();

  glCat.attribute( 'p', vboQuad, 2 );
  glCat.uniform2fv( 'resolution', [ width, height ] );
  glCat.uniformTexture( 'texture', framebufferMotionblur.texture, 0 );

  gl.drawArrays( gl.TRIANGLE_STRIP, 0, 4 );
};

// ---

let update = () => {
  if ( !checkboxPlay.checked ) {
    requestAnimationFrame( update );
    return;
  }


  textureRandomUpdate();

  let timePrev = time;
  time = ( ( frame + iSample / nSample ) / frames ) % 1.0;
  let deltaTime = time - timePrev;

  render( iSample );

  iSample ++;
  if ( iSample === nSample ) {
    if ( checkboxSave.checked ) {
      saveFrame();
    }

    iSample = 0;
    frame ++;
  }

  console.log( frame );

  requestAnimationFrame( update );
};

update();
