/*
 * Namespace: lb.base
 * Adapter Modules for Base JavaScript Library
 *
 * Authors:
 *   o Eric Bréchemier <github@eric.brechemier.name>
 *   o Marc Delhommeau <marc.delhommeau@legalbox.com>
 *
 * Copyright:
 * Eric Bréchemier (c) 2011-2013, Some Rights Reserved
 * Legal-Box SAS (c) 2010-2011, All Rights Reserved
 *
 * License:
 * BSD License
 * http://creativecommons.org/licenses/BSD/
 *
 * Version:
 * 2013-09-10
 */
/*global define */
define(
  [
    "./lb"
  ],
  function(lb) {

    function no( value ) {
      // Function: no(value): boolean
      // Check whether given value is null or undefined
      //
      // Parameter:
      //   value - any, the value to check
      //
      // Returns:
      //   boolean, false when the value is null or undefined,
      //   true otherwise

      var undef; // do not trust global undefined, which can be set to a value
      return value === null || value === undef;
    }

    function or( a, b ) {
      // Function: or(a,b): any
      // Get a default value when given value is null or undefined
      //
      // Parameters:
      //   a - any, the value to check
      //   b - any, the default value
      //
      // Returns:
      //   any, the default value when the value is null or undefined,
      //   the value itself otherwise.
      return no( a )? b: a;
    }

    // Assign to lb.base
    // for backward-compatibility in browser environment
    lb.base = { // public API
      no: no,
      or: or
    };

    return lb.base;
  }
);
