/*
 * Namespace: lb.base.history
 * History (in Local Navigation) Adapter Module for Base Library
 *
 * This module provides support for local navigation, setting, getting and
 * detecting changes in the hash, the local part of the url.
 *
 * The module must be loaded in a static way, e.g. part of an external script
 * included at the end of the <body>. During its loading, it will initialize
 * the history manager, which must be done before the page "load" event.
 * Loading this module dynamically after the page "load" may result in the page
 * being reset to blank.
 *
 * The module requires two elements to be present in the initial document,
 * an iframe of id 'lb.base.history.iframe' (in Internet Explorer) and a hidden
 * input field of id 'lb.base.history.input' (in all browsers, including IE).
 * In case these elements are not found, they will be created during the module
 * initialization using document.write.
 *
 * The two elements should be hidden. The source of the iframe can be any
 * resource on the same from the same domain as the document [1]. We advise to
 * set it to the location of the favicon, which has been loaded already and
 * will not cost another roundtrip. The iframe is only needed in IE [2], and
 * can be created within a conditional comment to spare its creation cost in
 * other browsers:
 *
 * | <!--[if IE]>
 * |   <iframe id="lb.base.history.iframe" src="favicon.ico" class="hidden"
 * |   ></iframe>
 * | <![endif]-->
 * | <input id="lb.base.history.input" type="hidden" />
 *
 * The following CSS can be used to hide the iframe (in IE)
 * | iframe.hidden {
 * |   position: absolute;
 * |   top: 0;
 * |   left: 0;
 * |   width: 1px;
 * |   height: 1px;
 * |   visibility: hidden;
 * | }
 *
 * When the iframe is not present in the document, its src attribute location
 * is set to the expected location of the favicon:
 * - either configured in a link part of the page <head>:
 * |  <link rel='shortcut icon' href='favicon.ico' />
 * - or by default '/favicon.ico', at the root of the web site.
 *
 * Warning:
 * In case the resource referenced by the iframe src is missing, e.g. because
 * the iframe was not present in the document and no favicon is present at the
 * root of the web server, "Access is denied" errors may happen at random in IE
 * when the page is refreshed and setToken() is called to set a new hash.
 *
 * References:
 *   + [1] YUI 2: Browser History Manager
 *     http://developer.yahoo.com/yui/history/
 *
 *   + [2] History - Closure Library API Documentation
 *     http://closure-library.googlecode.com/svn/docs/class_goog_History.html
 *
 *   + [3] How to Add a Shortcut Icon to a Web Page
 *     http://msdn.microsoft.com/en-us/library/ms537656%28VS.85%29.aspx
 *
 * Author:
 * Eric Bréchemier <legalbox@eric.brechemier.name>
 *
 * Copyright:
 * Legal Box SAS (c) 2010, All Rights Reserved
 *
 * License:
 * BSD License
 * http://creativecommons.org/licenses/BSD/
 *
 * Version:
 * 2010-06-11
 */
/*requires lb.base.js */
/*requires lb.base.dom.js */
/*requires lb.base.dom.Listener.js */
/*requires closure/goog.events.js */
/*requires closure/goog.History.js */
/*jslint nomen:false, white:false, onevar:false, plusplus:false */
/*global lb, goog, window, document */
// preserve the module, if already loaded
lb.base.history = lb.base.history || (function() {
  // Builder of
  // Closure for lb.base.history module

  // Declare aliases
  var History = goog.History,
      NAVIGATE = History.EventType.NAVIGATE,
      listen = goog.events.listen,
        // use encodeURI / decodeURI instead of encodeURIComponent and
        // decodeURIComponent because the hash may contain a path with slashes,
        // i.e. more than one URI component. The / character gets encoded as
        // %2F by encodeURIComponent; it is preserved by encodeURI.
        // References:
        //   [1] encodeURIComponent Method (Windows Scripting - JScript)
        //   http://msdn.microsoft.com/en-us/library/aeh9cef7%28VS.85%29.aspx
        //
        //   [2] encodeURI - Mozilla Developper Center
        //   https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference
        //                                   /Global_Functions/encodeURI
      encodeHash = window.encodeURI,
      decodeHash = window.decodeURI,
      $ = lb.base.dom.$,
      Listener = lb.base.dom.Listener,

  // Private fields

     // object - the underlying history manager (instance of goog.History)
     history = null,

     // object - the unload listener to destroy the history
     //          (instance of lb.base.dom.Listener)
     unloadListener = null;

  function getFaviconUrl(){
    // Function: getFaviconUrl(): string
    // Get the expected url of the shortcut icon.
    //
    // Returns:
    //   - string, the href of the first link with rel 'shortcut icon'
    //     (case-insensitive) found in the <head>,
    //   - or '/favicon.ico' by default
    //
    // Reference:
    //   [1] How to Add a Shortcut Icon to a Web Page
    //   http://msdn.microsoft.com/en-us/library/ms537656%28VS.85%29.aspx

    var head = document.getElementsByTagName('HEAD')[0],
        node;
    if (head){
      node = head.firstChild;
      while(node){
        if ( node.tagName === 'LINK' &&
             node.rel && node.rel.toUpperCase() === 'SHORTCUT ICON' ){
          return node.href;
        }
        node = node.nextSibling;
      }
    }

    // default to '/favicon.ico' when missing
    return '/favicon.ico';
  }

  function getHash(){
    // Function: getHash(): string
    // Get the hash part of current url.
    //
    // Note:
    // The underlying history manager must have been initialized with init(),
    // and not destroyed yet.
    //
    // Returns:
    //   * null when the history manager has been destroyed or not initialized
    //   * string, the url-decoded value of the current hash otherwise

    if (!history){
      return null;
    }
    return '#'+decodeHash( history.getToken() );
  }

  function setHash(hash){
    // Function: setHash(hash)
    // Set a hash part in current url.
    //
    // Notes:
    // The hash will be encoded in this function.
    // This call has no effect if the history manager is not initialized.
    //
    // Param:
    //   hash - string, the new hash part to set, with or without the initial
    //          hash sign, e.g. 'new-hash', '#new-hash' or '#new hash'

    if (!history){
      return null;
    }

    if ( hash.charAt(0) === '#' ){
      // setToken does not expect a hash sign at start of token
      // which would results in duplicate hash
      hash = hash.slice(1);
    }

    history.setToken(
      encodeHash(hash),
      // opt_title - string
      // Optional title to display in IE history.
      // I set the hash as optional title, which is better than the default,
      // the src of the iframe (e.g. http://example.com/favicon.ico)
      hash
    );
  }

  function onHashChange(callback){
    // Function: onHashChange(callback)
    // Register a callback for modifications of the hash.
    //
    // Note:
    // The call is ignored when the underlying history manager has not been
    // initialized, or has been destroyed.
    //
    // Param:
    //   callback - function, a function callback(hash), which will be called
    //              for each subsequent change of hash. The new hash, decoded
    //              and starting with '#', will be provided as parameter.

    if (!history){
      return;
    }

    listen(history, NAVIGATE, function(event){
      // refactoring with getHash() possible for the hash conversion
      callback( '#'+decodeHash(event.token) );
    });
  }

  function destroy(){
    // Function: destroy()
    // Terminate the history manager.

    if (history){
      history.dispose();
      history = null;
    }
    if (unloadListener){
      unloadListener.detach();
      unloadListener = null;
    }
  }

  // Initialize the history manager.
  //
  // Notes:
  // Nothing happens when the history manager has already been initialized.
  // The polling loop does not start until the first listener is added in a
  // call to onHashChange().

  if (history){
    // already initialized
    return;
  }

  history = new History(
    // opt_invisible : boolean
    // Don't hide the hash, make it visible in url
    false,
    // opt_blankPageUrl : string
    // Only used in IE when the iframe is not present.
    // Use the favicon as default, it is probably in cache already.
    // If you need to customize this path, you should create the iframe,
    // or specify the path to the favicon in a link with rel='shortcut icon'
    // in the document <head>:
    //   <link rel='shortcut icon' href='myicon.ico'/>
    //
    // Reference:
    //   [1] Favicon - From Wikipedia, the free encyclopedia
    //   http://en.wikipedia.org/wiki/Favicon$
    //
    //   [2] How to Add a Shortcut Icon to a Web Page
    //   http://msdn.microsoft.com/en-us/library/ms537656%28VS.85%29.aspx
    //
    //   [3] How to Add a Favicon to your Site
    //   http://www.w3.org/2005/10/howto-favicon
    getFaviconUrl(),
    // opt_input : HTMLInputElement
    // HTML input element used to track state in all browsers.
    // Initialize with $('lb.base.history.input') (may be null).
    $('lb.base.history.input'),
    // opt_iframe : HTMLIFrameElement
    // iframe used in IE to push history state changes.
    // Initialize with $('lb.base.history.iframe') (may be null).
    $('lb.base.history.iframe')
  );
  // Enable immediately to avoid inconsistent cross-browser behavior when the
  // history manager gets enabled only after the first listener is added:
  // sometimes the initial hash is dispatched, sometimes not. Since no listener
  // can be added before the initialization, none will get the initial hash,
  // which can be retrieved with getHash().
  history.setEnabled(true);
  unloadListener = new Listener(window, 'unload', destroy);

  return { // public API
    getFaviconUrl: getFaviconUrl,
    getHash: getHash,
    setHash: setHash,
    onHashChange: onHashChange,
    destroy: destroy
  };
}());