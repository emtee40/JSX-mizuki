/***
 * Mersenne-Twister pseude-random generator ported from mt19937ar.c
 */

/*
SYNOPSIS:

    import "random/mt.jsx";

    // constructor for Mersenne Twister random generator
    var mt = new MT; // set a seed automatically
    var mt = new MT(42);
    var mt = new MT([0x123, 0x234, 0x345, 0x456]);

    // re-initialization
    mt.initialize(Date.now());
    mt.initialize([Date.now(), Date.now()]);

    // get the next 32-bit integer (0 <= x < 0xffffffff)
    log mt.nextInt();

    // get the next floating point number (0.0 <= x < 1.0)
    // with 53-bit resolution
    log mt.nextReal();

    // get the next floating point number (0.0 <= x < 1.0)
    // with 32-bit resolution, which is faster than nextReal()
    log mt.nextReal32();

    // get an RFC-4122-complaint UUID
    log mt.nextUUID();
 */

/*
   A C-program for MT19937, with initialization improved 2002/1/26.
   Coded by Takuji Nishimura and Makoto Matsumoto.

   Before using, initialize the state by using init_genrand(seed)
   or init_by_array(init_key, key_length).

   Copyright (C) 1997 - 2002, Makoto Matsumoto and Takuji Nishimura,
   All rights reserved.

   Redistribution and use in source and binary forms, with or without
   modification, are permitted provided that the following conditions
   are met:

     1. Redistributions of source code must retain the above copyright
        notice, this list of conditions and the following disclaimer.

     2. Redistributions in binary form must reproduce the above copyright
        notice, this list of conditions and the following disclaimer in the
        documentation and/or other materials provided with the distribution.

     3. The names of its contributors may not be used to endorse or promote
        products derived from this software without specific prior written
        permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
   "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
   LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
   A PARTICULAR PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
   CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
   EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
   PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
   PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
   LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
   NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


   Any feedback is very welcome.
   http://www.math.sci.hiroshima-u.ac.jp/~m-mat/MT/emt.html
   email: m-mat @ math.sci.hiroshima-u.ac.jp (remove space)
*/

import "./base.jsx";

/**
 * The Mersenne Twister implementation.
 */
final class MT implements RandomGenerator {
    // Period parameters
    static const _N = 624;
    static const _M = 397;
    static const _MATRIX_A   = 0x9908b0df; // constant vector a
    static const _UPPER_MASK = 0x80000000; // most significant w-r bits
    static const _LOWER_MASK = 0x7fffffff; // least significant r bits

    // multiplies uint32_t
    static function _mul(a : number, b : number) : number {
        const a1 = a >>> 16;
        const a2 = a & 0xffff;
        const b1 = b >>> 16;
        const b2 = b & 0xffff;

        return (((a1 * b2 + a2 * b1) << 16) + a2 * b2) >>> 0;
    }

    // the state vector
    // number[] is the fastest in number[], int[] and Uint32Array on nodejs
    var _mt = new number[](MT._N);

    // mti == N+1 means mt[N] is not initialized
    var _mti = 0;

    function constructor() {
        const seeds = new Array.<number>;
        for (var i = 0; i < 4; ++i) { // at least 256 bits seeds
            seeds.push(this.generateSeed());
        }
        this.initialize(seeds);
    }

    function constructor(seed : number) {
        this.initialize(seed);
    }
    function constructor(seeds : number[]) {
        this.initialize(seeds);
    }

    function initialize(s : number) : void {
        const mt = this._mt;
        mt[0] = s >>> 0;

        for(var i = 1; i < MT._N; ++i) {
            mt[i] = MT._mul(1812433253, mt[i-1] ^ (mt[i-1] >>> 30)) + i;
        }
        this._mti = i;
    }

    function initialize(seeds : number[]) : void {
        this.initialize(19650218);

        const mt = this._mt;

        var i = 1;
        var j = 0;
        var k = MT._N > seeds.length ? MT._N : seeds.length;

        for (; k > 0; --k) {
            mt[i] = (mt[i] ^ MT._mul(mt[i-1] ^ (mt[i-1] >>> 30), 1664525))
                + (seeds[j] >>> 0) + j;

            ++i;
            ++j;

            if (i >= MT._N) {
                mt[0] = mt[MT._N-1];
                i = 1;
            }
            if (j >= seeds.length) {
                j = 0;
            }
        }
        for (k = MT._N-1; k > 0; --k) {
            mt[i] = (mt[i] ^ MT._mul(mt[i-1] ^ (mt[i-1] >>> 30), 1566083941))
                - i;

            ++i;
            if (i >= MT._N) {
                mt[0] = mt[MT._N-1];
                i = 1;
            }
        }
        mt[0] = 0x80000000; // MSB is 1; assuring non-zero initial array
    }

    /**
     * generates a random number on [0,0xffffffff]-interval
     */
    override function nextInt32() : number {
        if (this._mti >= MT._N) {
            this._nextState();
        }

        return this._temper( this._mt[this._mti++]);
    }

    static const _mag01 = [ 0x0, MT._MATRIX_A ];

    function _nextState() : void {
        const mt = this._mt;
        var kk = 0;
        for (; kk < MT._N - MT._M; ++kk) {
            var y = (mt[kk] & MT._UPPER_MASK) | (mt[kk+1] & MT._LOWER_MASK);
            mt[kk] = (mt[kk+MT._M] ^ (y >>> 1) ^ MT._mag01[y & 0x1]) >>> 0;
        }
        for (; kk < MT._N - 1; ++kk) {
            var y = (mt[kk] & MT._UPPER_MASK) | (mt[kk+1] & MT._LOWER_MASK);
            mt[kk] = (mt[kk+(MT._M-MT._N)] ^ (y >>> 1) ^ MT._mag01[y & 0x1]) >>> 0;
        }
        var y = (mt[MT._N-1] & MT._UPPER_MASK) | (mt[0] & MT._LOWER_MASK);
        mt[MT._N-1] = (mt[MT._M-1] ^ (y >>> 1) ^ MT._mag01[y & 0x1]) >>> 0;

        this._mti = 0;
    }

    function _temper(y : number) : number {

        y ^= (y >>> 11);
        y ^= (y <<   7) & 0x9d2c5680;
        y ^= (y <<  15) & 0xefc60000;
        y ^= (y >>> 18);

        return y >>> 0;
    }
}

// vim: set expandtab:
