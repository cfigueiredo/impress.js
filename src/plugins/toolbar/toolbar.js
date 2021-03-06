/**
 * Toolbar plugin
 *
 * This plugin provides a generic graphical toolbar. Other plugins that
 * want to expose a button or other widget, can add those to this toolbar.
 *
 * Using a single consolidated toolbar for all GUI widgets makes it easier
 * to position and style the toolbar rather than having to do that for lots
 * of different divs.
 *
 *
 * *** For presentation authors: *****************************************
 *
 * To add/activate the toolbar in your presentation, add this div:
 *
 *     <div id="impress-toolbar"></div>
 * 
 * This toolbar sets CSS classes `impress-toolbar-show` on mousemove and
 * `impress-toolbar-hide` after a few seconds of inactivity. This allows authors
 * to use CSS to hide the toolbar when it's not used.
 *
 * Styling the toolbar is left to presentation author. Here's an example CSS:
 *
 *    .impress-enabled div#impress-toolbar {
 *        position: fixed;
 *        right: 1px;
 *        bottom: 1px;
 *        opacity: 0.6;
 *    }
 *    .impress-enabled div#impress-toolbar > span {
 *        margin-right: 10px;
 *    }
 *    .impress-enabled div#impress-toolbar.impress-toolbar-show {
 *        display: block;
 *    }
 *    .impress-enabled div#impress-toolbar.impress-toolbar-hide {
 *        display: none;
 *    }
 *
 *
 * *** For plugin authors **********************************************
 *
 * To add a button to the toolbar, trigger the `impress:toolbar:appendChild`
 * or `impress:toolbar:insertBefore` events as appropriate. The detail object
 * should contain following parameters:
 *
 *    { group : 1,                       // integer. Widgets with the same group are grouped inside the same <span> element.
 *      html : "<button>Click</button>", // The html to add.
 *      callback : "mycallback",         // Toolbar plugin will trigger event `impress:toolbar:added:mycallback` when done.
 *      before: element }                // The reference element for an insertBefore() call.
 *
 * You should also listen to the `impress:toolbar:added:mycallback` event. At 
 * this point you can find the new widget in the DOM, and for example add an
 * event listener to it.
 *
 * You are free to use any integer for the group. It's ok to leave gaps. It's
 * ok to co-locate with widgets for another plugin, if you think they belong
 * together.
 *
 * See navigation-ui for an example.
 *
 * Copyright 2016 Henrik Ingo (@henrikingo)
 * Released under the MIT license.
 */
(function ( document, window ) {
    'use strict';
    var toolbar = document.getElementById("impress-toolbar");
    var groups = [];
    var timeoutHandle;
    // How many seconds shall UI toolbar be visible after a touch or mousemove
    var timeout = 3;

    /**
     * Add a CSS class to mark that toolbar should be shown. Set timeout to switch to a class to hide them again.
     */
    var showToolbar = function(){
        toolbar.classList.add( "impress-toolbar-show" );
        toolbar.classList.remove( "impress-toolbar-hide" );

        if ( timeoutHandle ) {
            clearTimeout(timeoutHandle);
        }
        timeoutHandle = setTimeout( function() { 
            toolbar.classList.add( "impress-toolbar-hide" );
            toolbar.classList.remove( "impress-toolbar-show" );
        }, timeout*1000 );
    };

    /**
     * Start on impress.js init
     */
    document.addEventListener("impress:init", function (event) {
        if ( toolbar ) {
            document.addEventListener("mousemove", showToolbar);
            document.addEventListener("click", showToolbar);
            document.addEventListener("touch", showToolbar);
            // At the beginning of presentation, also show the toolbar
            showToolbar();
        }
    }, false);

    var triggerEvent = function (el, eventName, detail) {
        var event = document.createEvent("CustomEvent");
        event.initCustomEvent(eventName, true, true, detail);
        el.dispatchEvent(event);
    };
    
    /**
     * Get the span element that is a child of toolbar, identified by index.
     *
     * If span element doesn't exist yet, it is created.
     *
     * Note: Because of Run-to-completion, this is not a race condition.
     * https://developer.mozilla.org/en/docs/Web/JavaScript/EventLoop#Run-to-completion
     *
     * :param: index   Method will return the element <span id="impress-toolbar-group-{index}">
     */
    var getGroupElement = function(index){
        var id = "impress-toolbar-group-" + index;
        if(!groups[index]){
            groups[index] = document.createElement("span");
            groups[index].id = id;
            var nextIndex = getNextIndex(index);
            if ( nextIndex === undefined ){
                toolbar.appendChild(groups[index]);
            }
            else{
                toolbar.insertBefore(groups[index], groups[nextIndex]);
            }
        }
        return groups[index];
    };
    
    /**
     * Get the node from groups[] that is immediately after given index.
     *
     * This can be used to find the reference node for an insertBefore() call.
     * If no element exists at a larger index, returns undefined. (In this case,
     * you'd use appendChild() instead.)
     *
     * Note that index needn't itself exist in groups[].
     */
    var getNextIndex = function(index){
        var i = index+1;
        while( ! groups[i] && i < groups.length) {
            i++;
        }
        if( i < groups.length ){
            return i;
        }
    };

    // API
    // Other plugins can add and remove buttons by sending them as events.
    // In return, toolbar plugin will trigger events when button is pressed.
    if (toolbar) {
        /**
         * Append a widget inside toolbar span element identified by given group index.
         *
         * :param: e.detail.group    integer specifying the span element where widget will be placed
         * :param: e.detail.html     html code that is the widget to show in the toolbar
         * :param: e.detail.callback a string used in the event triggered when new widget is added
         */
        toolbar.addEventListener("impress:toolbar:appendChild", function( e ){
            var group = getGroupElement(e.detail.group);
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = e.detail.html;
            var widget = tempDiv.firstChild;
            group.appendChild(widget);

            // Once the new widget is added, send a callback event so that the caller plugin
            // can, for example, add its event listeners to the new button.
            var callbackEvent = "impress:toolbar:added:" + e.detail.callback;
            triggerEvent(toolbar, callbackEvent, toolbar );
            triggerEvent(toolbar, "impress:toolbar:added", toolbar );
        });

        toolbar.addEventListener("impress:toolbar:insertBefore", function( e ){
            var tempDiv = document.createElement("div");
            tempDiv.innerHTML = e.detail.html;
            var widget = tempDiv.firstChild;
            toolbar.insertBefore(widget, e.detail.before);

            // Once the new widget is added, send a callback event so that the caller plugin
            // can, for example, add its event listeners to the new button.
            var callbackEvent = "impress:toolbar:added:" + e.detail.callback;
            triggerEvent(toolbar, callbackEvent, toolbar );
            triggerEvent(toolbar, "impress:toolbar:added", toolbar );
        });

        /**
         * Remove the widget in e.detail.remove.
         */
        toolbar.addEventListener("impress:toolbar:removeWidget", function( e ){
            toolbar.removeChild(e.detail.remove);
            triggerEvent(toolbar, "impress:toolbar:removed", toolbar );
        });
    } // if toolbar

})(document, window);
