/*
 * Copyright 2016 Henrik Ingo (@henrikingo)
 *
 * Released under the MIT license. See LICENSE file.
 */

QUnit.begin(function( details ) {
  // In case tests didn't complete, we are left with a hash/anchor pointing somewhere. But we want to start from scratch:
  window.location.hash = "";    
});

QUnit.test( "Initialize Impress.js", function( assert ) {
  // Init triggers impress:init event, which we want to catch.
  // Note: We also *must* catch all events before exiting and continuing with next block.
  var doneInit      = assert.async();
  var doneStepEnter = assert.async();
  var doneSync      = assert.async();

  var root  = document.querySelector( "div#impress" );

  // Test events triggered by init()
  var assertInit = function( event ) {
    assert.ok( true, "impress:init event triggered.");
    // IMPORTANT: Before exiting a QUnit.test() block, we must cleanup any DOM changes, including event listeners.
    root.removeEventListener( "impress:init", assertInit );
    doneInit();
  };
  root.addEventListener( "impress:init", assertInit );
  var assertStepEnter = function( event ) {
    assert.ok( true, "impress:stepenter event triggered.");

    var step1 = document.querySelector( "div#step-1" );
    assert.equal( event.target, step1,
                  event.target.id + " triggered impress:stepenter event." );
/*
    assert.ok( event.target.classList.contains("present"),
               event.target.id + " set present css class." );
    assert.ok( !event.target.classList.contains("future"),
               event.target.id + " unset future css class." );
    assert.ok( !event.target.classList.contains("past"),
               event.target.id + " unset past css class." );
    assert.equal( "#/"+event.target.id, window.location.hash,
                  "Hash is " + "#/"+event.target.id );
*/
    // Cleanup self
    root.removeEventListener( "impress:init", assertInit );
    doneStepEnter();
  };
  root.addEventListener( "impress:stepenter", assertStepEnter );


  // Synchronous code and assertions
  assert.ok( impress, 
             "impress declared in global scope" );
  assert.strictEqual( impress().init(), undefined,
                    "impress().init() called." );
  assert.strictEqual( impress().init(), undefined,
                    "It's ok to call impress().init() a second time, it's a no-op." );
                    
  // The asserts below are true immediately after impress().init() returns.
  // Therefore we test them here, not in an event handler.
  var notSupportedClass = document.body.classList.contains("impress-not-supported");
  var yesSupportedClass = document.body.classList.contains("impress-supported");
  if ( !_impressSupported() ) {
    assert.ok( notSupportedClass,
               "body.impress-not-supported class still there." );
    assert.ok( !yesSupportedClass,
               "body.impress-supported class was NOT added." );
  } else {
    assert.ok( !notSupportedClass,
               "body.impress-not-supported class was removed." );
    assert.ok( yesSupportedClass,
               "body.impress-supported class was added." );
               
    // To be pedantic, we run the rest of these tests inside the else 
    // brackets as well, meaning that impress.js is tested to be supported.
    // However, other QUnit.test() blocks than this will fail miserably if it
    // weren't supported.
    assert.ok( !document.body.classList.contains("impress-disabled"),
               "body.impress-disabled is removed." );
    assert.ok( document.body.classList.contains("impress-enabled"),
               "body.impress-enabled is added." );
    
    var canvas = document.querySelector( "div#impress > div" );
    assert.ok( !canvas.classList.contains("step") && canvas.id === "",
               "Additional 'canvas' div inserted between div#impress root and steps." );
    assert.equal( canvas.style.transform,
                  "rotateZ(0deg) rotateY(0deg) rotateX(0deg) translate3d(1000px, 0px, 0px)",
                  "canvas.style.transform initialized correctly" );
    assert.equal( canvas.style.transformOrigin,
                  "left top 0px",
                  "canvas.style.transformOrigin initialized correctly" );
    assert.equal( canvas.style.transformStyle,
                  "preserve-3d",
                  "canvas.style.transformStyle initialized correctly" );
    assert.equal( canvas.style.transitionDelay,
                  "0ms",
                  "canvas.style.transitionDelay initialized correctly" );
    // impress.js default values tries to set this to 1000ms, I'm completely confused about why that's not actually set in the browser?
    assert.equal( canvas.style.transitionDuration,
                  "0ms",
                  "canvas.style.transitionDuration initialized correctly" );
    assert.equal( canvas.style.transitionProperty,
                  "all",
                  "canvas.style.transitionProperty initialized correctly" );
    assert.equal( canvas.style.transitionTimingFunction,
                  "ease-in-out",
                  "canvas.style.transitionTimingFunction initialized correctly" );
                  
    assert.equal( document.documentElement.style.height,
                  "100%",
                  "documentElement.style.height is 100%" );
    
    // Steps initialization
    var step1 = document.querySelector( "div#step-1" );
    assert.equal( step1.style.position,
                  "absolute",
                  "Step position is 'absolute'." );

    assert.ok( step1.classList.contains("active"),
               "Step 1 has active css class." );
    
  }
  doneSync();
});

// Note: Here we focus on testing the core functionality of moving between
// steps, the css classes set and unset, and events triggered.
// TODO: more complex animations and check position, transitions, delays, etc...
// Those need to be separate html files, and there could be several of them.
QUnit.test( "Impress Core API", function( assert ) {
  // impress.js itself uses event listeners to manipulate most CSS classes. 
  // Wait a short while before checking, to avoid race. 
  // (See assertStepEnterWrapper and assertStepLeaveWrapper.)
  var wait = 5; // milliseconds

  var done = assert.async();
  var step1 = document.querySelector( "div#step-1" );
  var step2 = document.querySelector( "div#step-2" );
  var step3 = document.querySelector( "div#step-3" );
  var step4 = document.querySelector( "div#fourth" );
  var root  = document.querySelector( "div#impress" );

  // On impress:stepenter, we do some assertions on the "entered" object. 
  // On impress:stepleave, we do some assertions on the "left" object.
  // Finally we call next() to initialize the next transition, and it starts all over again. 
  var i = 0;
  var sequence = [ { left    : step1, // impress:stepleave is not triggered when leaving step-1 the first time. 
                     entered : step2,
                     next    : function(){ return impress().goto(2); },
                     text    : "goto(<number>) called and returns ok (2->3)" },
                   { left    : step2,
                     entered : step3,
                     next    : function(){ return impress().goto("fourth"); },
                     text    : "goto(<string>) called and returns ok (3->4)" },
                   { left    : step3,
                     entered : step4,
                     next    : function(){ return impress().next(); },
                     text    : "next() wraps around to first step (4->1)" },
                   { left    : step4,
                     entered : step1,
                     next    : function(){ return impress().prev(); },
                     text    : "prev() wraps around to last step (1->4)" },
                   { left    : step1,
                     entered : step4,
                     next    : function(){ return impress().prev(); },
                     text    : "prev() called and returns ok (4->3)" },
                   { left    : step4,
                     entered : step3,
                     next    : function(){ return impress().goto(0); },
                     text    : "End of test suite, return to first step with goto(0)." },
                   { left    : step3,
                     entered : step1,
                     next    : false } // false = end of sequence
  ];
  // When both assertStepEnter and assertStepLeave are done, we can go to next step in sequence.
  var readyCount = 0; // 1 because first time impress:stepleave not happening.
  var readyForNext = function(){
    readyCount++;
    if( readyCount % 2 == 0 ) {
      if( sequence[i].next ) {
        assert.ok( sequence[i].next(), sequence[i].text );
        i++;
        assertImmediately();
      } else {
        // Remember to cleanup, since we're operating outside of qunit-fixture
        root.removeEventListener( "impress:stepenter", assertStepEnterWrapper );
        root.removeEventListener( "impress:stepleave", assertStepLeaveWrapper );
        done();
      }
    }
  };
  
  // Things to check on impress:stepenter event -----------------------------//
  var assertStepEnter = function( event, registeredListener ) {
    assert.equal( event.target, sequence[i].entered,
                  event.target.id + " triggered impress:stepenter event." );
    assert.ok( event.target.classList.contains("present"),
               event.target.id + " set present css class." );
    assert.ok( !event.target.classList.contains("future"),
               event.target.id + " unset future css class." );
    assert.ok( !event.target.classList.contains("past"),
               event.target.id + " unset past css class." );
    assert.equal( "#/"+event.target.id, window.location.hash,
                  "Hash is " + "#/"+event.target.id );
    readyForNext();
  };
  
  var assertStepEnterWrapper = function( event ) {
    setTimeout( function() { assertStepEnter( event ) }, wait ); 
  };
  root.addEventListener( "impress:stepenter", assertStepEnterWrapper );


  // Things to check on impress:stepleave event -----------------------------//
  var assertStepLeave = function( event, registeredListener ) {
    assert.equal( event.target, sequence[i].left,
                  event.target.id + " triggered impress:stepleave event." );
    assert.ok( !event.target.classList.contains("present"),
               event.target.id + " unset present css class." );
    assert.ok( !event.target.classList.contains("future"),
               event.target.id + " unset future css class." );
    assert.ok( event.target.classList.contains("past"),
               event.target.id + " set past css class." );
    readyForNext();
  };

  var assertStepLeaveWrapper = function( event ) {
    setTimeout( function() { assertStepLeave( event ) }, wait );
  };
  root.addEventListener( "impress:stepleave", assertStepLeaveWrapper );
  
  // Things to check immediately after impress().goto() ---------------------------//
  var assertImmediately = function(){
    assert.ok( sequence[i].entered.classList.contains("active"),
               sequence[i].entered.id + " set active css class." );
    assert.ok( !sequence[i].left.classList.contains("active"),
               sequence[i].left.id + " unset active css class." );      
  };


  // Done with setup. Start testing! -----------------------------------------------//
  // Do no-op tests first, then trigger the sequence of transitions we setup above. //

  assert.strictEqual( impress().goto(document.querySelector( "div#impress" )),
                    false,
                    "goto() to a non-step element fails, as it should." );
  assert.strictEqual( impress().goto(),
                    false,
                    "goto(<nothing>) fails, as it should." );

  // This starts executing the sequence above     
  assert.ok( impress().next(),
             "next() called and returns ok (1->2)" );
});


// Note: As indicated in impress.js source code, the "basic navigation 
// plugin" will probably become its own plugin. But for now, it's part of 
// main impress.js and we therefore test it here.
QUnit.test( "Basic Navigation Plugin", function( assert ) {
  var wait = 5; // milliseconds

  var done = assert.async();
  var step1 = document.querySelector( "div#step-1" );
  var step2 = document.querySelector( "div#step-2" );
  var step3 = document.querySelector( "div#step-3" );
  var step4 = document.querySelector( "div#fourth" );
  var root  = document.querySelector( "div#impress" );

  var i = 0;
  var sequence = [ { left    : step1, 
                     entered : step2,
                     next    : function(){ return syn.type( "bodyid", " " ); },
                     text    : "space (2->3)" },
                   { left    : step2,
                     entered : step3,
                     next    : function(){ return syn.type( "bodyid", "[right]" ); },
                     text    : "[right] (3->4)" },
                   { left    : step3,
                     entered : step4,
                     next    : function(){ return syn.type( "bodyid", "\t" ); },
                     text    : "tab (4->1)" },
                   { left    : step4,
                     entered : step1,
                     next    : function(){ return syn.type( "bodyid", "[down]" ); },
                     text    : "[down] (1->2)" },
                   { left    : step1,
                     entered : step2,
                     next    : function(){ return syn.type( "bodyid", "[page-down]" ); },
                     text    : "[page-down] (2->3)" },
                   { left    : step2,
                     entered : step3,
                     next    : function(){ return syn.type( "bodyid", "[page-up]" ); },
                     text    : "[page-up] (3->2)" },
                   { left    : step3,
                     entered : step2,
                     next    : function(){ return syn.type( "bodyid", "[left]" ); },
                     text    : "[left] (2->1)" },
                   { left    : step2,
                     entered : step1,
                     next    : function(){ return syn.type( "bodyid", "[up]" ); },
                     text    : "[up] (1->4)" },
                   { left    : step1,
                     entered : step4,
                     next    : function(){ return syn.click( "step-2", {} ); },
                     text    : "click on 2 (4->2)" },
                   { left    : step4,
                     entered : step2,
                     next    : function(){ return syn.click( "linktofourth", {} ); },
                     text    : "click on link with href to id=fourth (2->4)" },
                   { left    : step2,
                     entered : step4,
                     next    : function(){ return impress().goto(0); },
                     text    : "Return to first step with goto(0)." },
                   { left    : step4, 
/*
                     entered : step1,
                     next    : function(){ return syn.click( "step-1", " " ); },
                     text    : "Click on currently active step, triggers events too. (1->1)" },
                   { left    : step1, 
                     entered : step1,
                     next    : function(){ return syn.click( "linktofirst", " " ); },
                     text    : "Click on link to currently active step, triggers events too. (1->1)" },
                   { left    : step1,
*/
                     entered : step1,
                     next    : false }
  ];

  var readyCount = 0;
  var readyForNext = function(){
    readyCount++;
    if( readyCount % 2 == 0 ) {
      if( sequence[i].next ) {
        assert.ok( sequence[i].next(), sequence[i].text );
        i++;
      } else {
        // Remember to cleanup, since we're operating outside of qunit-fixture
        root.removeEventListener( "impress:stepenter", assertStepEnterWrapper );
        root.removeEventListener( "impress:stepleave", assertStepLeaveWrapper );
        done();
      }
    }
  };
  
  // Things to check on impress:stepenter event -----------------------------//
  var assertStepEnter = function( event, registeredListener ) {
    assert.equal( event.target, sequence[i].entered,
                  event.target.id + " triggered impress:stepenter event." );
    readyForNext();
  };

  var assertStepEnterWrapper = function( event ) {
    setTimeout( function() { assertStepEnter( event ) }, wait ); 
  };
  root.addEventListener( "impress:stepenter", assertStepEnterWrapper );


  // Things to check on impress:stepleave event -----------------------------//
  var assertStepLeave = function( event, registeredListener ) {
    assert.equal( event.target, sequence[i].left,
                  event.target.id + " triggered impress:stepleave event." );
    readyForNext();
  };

  var assertStepLeaveWrapper = function( event ) {
    setTimeout( function() { assertStepLeave( event ) }, wait );
  };
  root.addEventListener( "impress:stepleave", assertStepLeaveWrapper );
  
  // Do some no-op assertions first -----------------------------------------//
  assert.ok( syn.click( "step-1", {} ),
             "Click on step that is currently active, should do nothing." );
  assert.ok( syn.click( "linktofirst", {} ),
             "Click on link pointing to step that is currently active, should do nothing." );
  
  // This starts executing the sequence above.
  // Must wait a little for the above no-ops to have completed first, avoid race.  
  setTimeout( function() {  
          assert.ok( impress().next(),
                     "next() called and returns ok (1->2)" );
                         }, wait );
});


// Cleanup
QUnit.done(function( details ) {
  // Impress.js will set the hash part of the url, we want to unset it when finished
  // Otherwise a refresh of browser page would not start tests from step 1
  window.location.hash = "";    
  // Add back vertical scrollbar so we can read results if there were failures. 
  document.body.style.overflow = 'auto';
});

