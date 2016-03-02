var _ = require('lodash')
    , request = require('request')
    , mimeTypes = require('mime-types')
    , xml2js = require('xml2js')
    , path = require('path')
    , q = require('q')
    , MAX_FILES = 30
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
            , album = step.input('album').first().toLowerCase()
            , token = dexter.provider('google').credentials('access_token')
            , files = step.input('file').toArray()
            , startAtKey = step.config('id') + '_start'
            , startAt = dexter.global(startAtKey, 0)
            , endAt = startAt + MAX_FILES
            , albumIdKey = step.config('id') + '_album'
            , albumId = dexter.global(albumIdKey)
        ;
        if(files.length === 0) {
            this.log('No files to process: skipping');
            return this.complete({});
        }
        dexter.setGlobal(startAtKey, endAt);
        if(albumId) {
            this.processFiles(files, startAt, endAt, albumId, googleId, token);
        } else {
            this.albums(token, googleId, function(err, data) {
                if(err) {
                    return self.fail(err);
                }
                self.log("Looking for '" + album + "' in albums", {
                    albums: _.map(data.feed.entry, function(entry) {
                        return entry.title[0];
                    })
                });
                _.each(data.feed.entry, function(entry) {
                    var title = entry.title[0].toLowerCase();
                    if(title === album) {
                        albumId = entry['gphoto:id'][0];
                        return false;
                    }
                });
                if(!albumId) {
                    return self.fail('Album not found');
                }
                dexter.setGlobal(albumIdKey, albumId);
                self.processFiles(files, startAt, endAt, albumId, googleId, token);
            });
        }
    }
    , processFiles: function(files, startAt, endAt, albumId, userId, token) {
        var chunk = _.slice(files, startAt, endAt)
            , realEnd = startAt + chunk.length
            , promises = []
            , self = this
        ;
        self.log('Uploading photos ' + (startAt + 1) + ' to ' + realEnd + ' of ' + files.length + ' photo(s)');
        _.each(chunk, function(file) {
            //0.10, which Lambda uses, doesn't have parse
            var fname = (path.parse) ? path.parse(file.path).base : path.basename(file.path);
            promises.push(
                self.files.get(file)
                    .then(function(buffer) { 
                        return q.nfapply(self.upload, [token, userId, albumId, fname, buffer]);
                    })
            );
        });
        q.all(promises)
            .then(function(results) {
                if(files.length > realEnd) {
                    self.replay();    
                } else {
                    self.complete({});
                }
            })
            .fail(self.fail.bind(self))
        ;
    }
    , albums: function(token, user, callback) {
        var headers = {
                'GData-Version': 2
                , 'Authorization': 'Bearer ' + token
                , 'Content-Length': 0
            }
            , url = "https://picasaweb.google.com/data/feed/api/user/" + user
            , self = this
        ;
        request
            .get(url, {
                headers: headers
            }, function(err, resp, body) {
                if(err) {
                    return callback(err, null);
                }
                if(resp.statusCode !== 200) {
                    self.log('Invalid response', { response: resp, body: body });
                    return callback(new Error('Bad response, status code ' + resp.statusCode));
                }
                xml2js.parseString(body, callback);
            });
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
