"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "getRootDirs", {
    enumerable: true,
    get: function() {
        return getRootDirs;
    }
});
var _glob = require("glob");
var _fs = require("node:fs");
/**
 * Process a Next.js root directory glob.
 */ var processRootDir = function(rootDir) {
    var pattern = rootDir.replace(/\\/g, '/');
    // Configuration patterns are bounded before either parser sees them.
    // Excessive expressions fail the lint command instead of skipping a rule.
    if (pattern.length > 65536) throw new Error('Next lint rootDir pattern too long');
    var frames = [], product = 1, parentheses = 0;
    for (var i = 0; i < pattern.length; i++) {
        var ch = pattern[i];
        if (ch === '(' && ++parentheses > 128) throw new Error('Next lint rootDir pattern too deep');
        if (ch === ')') parentheses = Math.max(0, parentheses - 1);
        if (ch === '{') {
            frames.push({start: i, choices: 1});
            if (frames.length > 128) throw new Error('Next lint rootDir pattern too deep');
        } else if (ch === ',' && frames.length) frames[frames.length - 1].choices++;
        else if (ch === '}' && frames.length) {
            var frame = frames.pop();
            var range = /^(-?\d+)\.\.(-?\d+)(?:\.\.(-?\d+))?$/.exec(pattern.slice(frame.start + 1, i));
            var choices = frame.choices;
            if (range) {
                var step = Math.abs(Number(range[3] || 1));
                choices = step ? Math.floor(Math.abs(Number(range[2]) - Number(range[1])) / step) + 1 : Infinity;
            }
            product *= choices;
            if (!Number.isFinite(product) || product > 8192) throw new Error('Next lint rootDir expansion exceeds limit');
        }
    }
    var isDirectory = function(path) {
        try { return _fs.statSync(path).isDirectory(); }
        catch (error) {
            if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return false;
            throw error;
        }
    };
    if (!(0, _glob.hasMagic)(pattern, {magicalBraces: true})) {
        return isDirectory(pattern) ? [pattern] : [];
    }
    // Preserve the original root-directory glob semantics. In fast-glob, a
    // terminal globstar matches descendants and excludes its base directory.
    var query = pattern.endsWith('/**') ? pattern + '/*' : pattern;
    return (0, _glob.globSync)(query, {follow: true, dot: false, nocase: false})
        .filter(isDirectory).map(function(path) {
            var prefix = pattern.startsWith('./') && !path.startsWith('./') ? './' : '';
            var suffix = pattern.endsWith('/') && !path.endsWith('/') ? '/' : '';
            return prefix + path + suffix;
        });
};
var getRootDirs = function(context) {
    var rootDirs = [
        context.cwd
    ];
    var nextSettings = context.settings.next || {};
    var rootDir = nextSettings.rootDir;
    if (typeof rootDir === 'string') {
        rootDirs = processRootDir(rootDir);
    } else if (Array.isArray(rootDir)) {
        rootDirs = rootDir.map(function(dir) {
            return typeof dir === 'string' ? processRootDir(dir) : [];
        }).flat();
    }
    return rootDirs;
};
