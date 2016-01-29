var _ = require('lodash')
    , q = require('q')
    , fs = require('fs')
    , tmp = require('tmp')
    , request = require('request')
    , mimeTypes = require('mime-types')
;
module.exports = {
    /**
     * The main entry point for the Dexter module
     *
     * @param {AppStep} step Accessor for the configuration for the step using this module.  Use step.input('{key}') to retrieve input data.
     * @param {AppData} dexter Container for all data used in this workflow.
     */
    run: function(step, dexter) {
        var self = this
            , googleId = 'default' //Magic name that uses the access token user's ID
            , album = step.input('album').first()
            , token = dexter.provider('google').credentials('access_token')
        ;
        step.input('file').each(function(file) {
            var fname = require('path').parse(file.path).base;
            self.files.get(file, function(err, buffer) { 
                if(err) {
                    self.fail(err);
                } else {
                   self.upload(token, googleId, album, fname, buffer, function(err, data) {
                       if(err) {
                           return self.fail(err);
                       }
                       return self.complete();
                   });
                }
            });
        });
    }
    , albums: function(token, user) {
        var headers = [
                'GData-Version: 2'
                , 'Authorization: Bearer ' + token
            ]
            , readBuffer = new streamBuffers.ReadableStreamBuffer()
            , meta = [
                '<entry xmlns="http://www.w3.org/2005/Atom">',
                '   <title>' + filename + '</title>',
                '   <summary>Migration from Dropbox</summary>',
                '   <category scheme="http://schemas.google.com/g/2005#kind',
                '       term="http://schemas.google.com/photos/2007#photo"/>',
                '</entry>'
            ].join("\n")
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user
        ;
    }
    , upload: function(token, user, album, filename, buffer, callback) {
        var headers = {
                'GData-Version': 2
                , 'Authorization': 'Bearer ' + token
                , 'Content-Type': mimeTypes.lookup(filename)
                , 'Content-Length': buffer.length
            }
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user + "/albumid/" + album
        ;
        request
            .post(url, {
                headers: headers
                , body: buffer
            })
            .on('error', function(err) {
                callback(err, null);
            })
            .on('response', function(response) {
                callback(null, response);
            })
        ;
    }
    /*
    , uploadMulti: function(token, user, album, filename, buffer, callback) {
        var headers = {
                'GData-Version': 2
                , 'Authorization': 'Bearer ' + token
                , 'Content-Type': 'mutipart/related; bondary="END_OF_PART"'
                , 'Content-Length': buffer.length
                , 'MIME-version': 1.0
            }
            , readBuffer = new streamBuffers.ReadableStreamBuffer()
            , meta = [
                '<entry xmlns="http://www.w3.org/2005/Atom">',
                '   <title>' + filename + '</title>',
                '   <summary>Migration from Dropbox</summary>',
                '   <category scheme="http://schemas.google.com/g/2005#kind',
                '       term="http://schemas.google.com/photos/2007#photo"/>',
                '</entry>'
            ].join("\n")
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user + "/albumid/" + album
            //, url = "https://photos.googleapis.com/data/feed/api/user/" + user + "/albumid/" + album
        ;
        console.log(url);
        readBuffer.put(buffer);
        request
            .post(url, {
                headers: headers
                , multipart: [
                    {
                        "content-type": "application/atom+xml"
                        , body: meta
                    }
                    , {
                        "content-type": mimeTypes.lookup(filename)
                        , body: readBuffer
                    }
                ]
            })
            .on('error', function(err) {
                callback(err, null);
            })
            .on('response', function(response) {
                callback(null, response);
            })
        ;
    }
    */
};
