var audioObject = null;

var callUrl = function(url, data, callback) {
    var ajaxParameters = {
        url: url,
        data: data,
        success: callback
    };

    // if the user is logged on, the rate limit is more friendly
    var accessToken = Session.get('spotify.accessToken');
    if (accessToken) {
        ajaxParameters.headers = {
            'Authorization': 'Bearer ' + accessToken
        };
    }

    $.ajax(ajaxParameters);
};

Template.results.helpers({
    albumTracks: function () {
        var tracks = Session.get('tracks');
        if (tracks && tracks.items) {
            tracks.items.sort(function (a, b) {
                return parseInt(a.track_number) - parseInt(b.track_number);
            });
        }
        return tracks;
    }
});

Template.results.events({
    "click .exportTracks": function (e) {
        e.preventDefault();
        //console.log(this);
        var csvArr = ["Artist;Album title;Album upc;Track name;Track isrc\r\n"];
        var currentArtist = Session.get('selected_artist');
        var currentAlbum = Session.get('selected_album');
        if (currentAlbum && currentAlbum.items && currentAlbum.items[0]) {
            currentArtist = currentArtist && currentArtist.items && currentArtist.items[0] ? currentArtist.items[0] : false;
            currentAlbum = currentAlbum.items[0];
            currentAlbumDetails = Session.get('album_details_' + currentAlbum.id);
            //console.log(currentArtist, currentAlbum, currentAlbumDetails);
            _.each(this.items, function (track) {
                var trackDetails = Session.get('track_details_' + track.id);
                if (currentArtist) {
                    var artist = currentArtist;
                } else {
                    var artist = track && track.artists && track.artists[0] ? track.artists[0] : {name: "Unknown"};
                }
                console.log(track);
                //Artist;Album title;Album upc;Track name;Track isrc
                csvArr.push('"' + artist.name + '";"' + currentAlbum.name + '";"' + currentAlbumDetails.external_ids.upc + '";"' + track.name + '";"' + trackDetails.external_ids.isrc + "\"\r\n");
            });
            var pom = document.createElement('a');
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(csvArr.join("")));
            pom.setAttribute('download', "spotsearch_export_" + (currentArtist ? currentArtist.name.replace(/ /g, '_') : "Various_Artists") + '_-_' + currentAlbum.name.replace(/ /g, '_') + ".csv");
            pom.click();
            //var newWindow = window.open('', "win", "width=640,height=480");
            //newWindow.document.write("<pre>" + csvArr.join(""));
        }
    }
});

Template.searchbox.onCreated(function() {
    if (document.location.hash) {
        var urlQuery = parseUrlQuery(document.location.hash.substr(1));
        if (urlQuery.access_token && urlQuery.expires_in) {
            // spotify login
            Session.setPersistent("spotify.accessToken", urlQuery.access_token);
            Session.setPersistent("spotify.expiresIn", urlQuery.expires_in);
        }
    }
});

Template.searchbox.helpers({
    userIsLoggedIn: function() {
        return !!Session.get('spotify.accessToken');
    }
});

Template.searchbox.events({
    "click .info": function (e) {
        e.preventDefault();
        if (Session.get('showInfo')) {
            Session.set('showInfo');
        } else {
            Session.set('showInfo', true);
        }
    },
    "click .user-login": function (e) {
        e.preventDefault();
        if (Session.get('spotify.accessToken')) {
            if (confirm('Do you want to logoff?')) {
                Session.set('spotify.accessToken');
                Session.set('spotify.expiresIn');
            }
        } else {
            Meteor.call('getSpotifyClientId', function(err, clientId) {
                if (!clientId) {
                    sweetAlert('Oops!', 'Spotify settings not found!', 'error');
                    return false;
                }
                if (confirm('Login to Spotify?')) {
                    var spotifyLoginUrl = "https://accounts.spotify.com/authorize";
                    spotifyLoginUrl += "?client_id=" + clientId;// response_type=token
                    spotifyLoginUrl += "&response_type=token";
                    //spotifyLoginUrl += "&redirect_uri=" + encodeURIComponent(document.location.origin + '/');
                    spotifyLoginUrl += "&redirect_uri=" + encodeURIComponent("http://spearch.herokuapp.com/");
                    spotifyLoginUrl += "&scope=user-read-email";
                    console.log(spotifyLoginUrl);
                    window.location.href = spotifyLoginUrl;
                }
            });
        }
    },
    "focus .search": function (e) {
        Session.set('compact_results', true);
        Session.set('search_results_show', true);
    },
    "blur .search": function (e) {
        Meteor.setTimeout(function () {
            Session.set('search_results_show', false);
            Session.set('compact_results', false);
        }, 200);
    },
    "keyup .search": _.debounce(function (e) {
        callUrl("https://api.spotify.com/v1/search?q=" + $('.search').val() + "&type=artist,album&limit=10", {}, function (data) {
            //console.log(data);
            Session.set('search_results', data);
        });
    }, 300),
    "keyup .artist, click #search_artist": function (e) {
        if (e.keyCode == 13 || e.type == 'click') {
            // https://api.spotify.com/v1/search?q=tania%20bowra&type=artist
            callUrl("https://api.spotify.com/v1/search?q=" + $('.artist').val() + "&type=artist&limit=50", {}, function (data) {
                //console.log(data);
                Session.set('artists', data.artists);
                Session.set('selected_artist');
                Session.set('albums');
                Session.set('selected_album');
                Session.set('tracks');
            });
        }
    },
    "keyup .album, click #search_album": function (e) {
        if (e.keyCode == 13 || e.type == 'click') {
            // https://api.spotify.com/v1/search?q=tania%20bowra&type=artist
            callUrl("https://api.spotify.com/v1/search?q=" + $('.album').val() + "&type=album&limit=50", {}, function (data) {
                //console.log(data);
                Session.set('artists');
                Session.set('selected_artist');
                Session.set('albums', data.albums);
                Session.set('selected_album');
                Session.set('tracks');
            });
        }
    }
});

Template.artist_list.events({
    "click .artist": function (e) {
        e.preventDefault();
        // console.log(e, e.currentTarget.id);
        var id = e.currentTarget.id;
        Session.set('selected_artist');
        searchArtist(id);
    }
});

var searchArtist = function (id) {
    var artists = Session.get('artists');
    if (!artists) {
        // check whether we are in the search box
        var search_results = Session.get('search_results');
        if (search_results && search_results.artists) {
            artists = search_results.artists;
        }
    }
    if (id && artists && artists.items) {
        _.each(artists.items, function (artist) {
            if (artist.id === id) {
                Session.set('selected_artist', {items: [artist]});
            }
        });
    }
    if (!Session.get('selected_artist')) {
        callUrl("https://api.spotify.com/v1/artists/" + id, {}, function (data) {
            //console.log(data);
            Session.set('selected_artist', {items: [data]});
        });
    }
    // https://api.spotify.com/v1/artists/{id}/albums
    callUrl("https://api.spotify.com/v1/artists/" + id + "/albums", {}, function (data) {
        //console.log(data);
        Session.set('artists');
        Session.set('albums', data);
        Session.set('selected_album');
        Session.set('tracks');
    });
};

Template.artist_list.helpers({
    image: function () {
        var image = false;
        if (this.images) {
            _.each(this.images, function (img) {
                if (img.url) {
                    image = img;
                }
            });
        }
        return image;
    }
});

Template.album_list.events({
    "click .artist_album": function (e) {
        e.preventDefault();
        // console.log(e, e.currentTarget.id);
        var id = e.currentTarget.id;
        var albums = Session.get('albums');
        if (!albums || Session.get('compact_results')) {
            // check whether we are in the search box
            var search_results = Session.get('search_results');
            if (search_results.albums) {
                albums = search_results.albums;
                Session.set('albums', albums);
                Session.set('artists');
                Session.set('selected_artist');
            }
        }
        if (id && albums && albums.items) {
            _.each(albums.items, function (album) {
                if (album.id === id) {
                    Session.set('selected_album', {items: [album]});
                }
            });
        }
        // https://api.spotify.com/v1/artists/{id}/albums
        callUrl("https://api.spotify.com/v1/albums/" + id + "/tracks?limit=50", {}, function (data) {
            //console.log(data);
            var trackData = data;
            Session.set('tracks', trackData);

            var currentTracks = 50;
            while (data.total > currentTracks) {
                callUrl("https://api.spotify.com/v1/albums/" + id + "/tracks?limit=50&offset=" + currentTracks, {}, function (data2) {
                    trackData.items = trackData.items.concat(data2.items);
                    Session.set('tracks', trackData);
                });
                currentTracks += 50;
            }
        });
    },
    "click .artist-label": function (e) {
        e.preventDefault();
        Session.set('selected_artist');
        Session.set('selected_album');
        searchArtist(e.target.id);
    }
});

Template.album_list.helpers({
    image: function () {
        var id = this.id;
        if (!Session.get('album_details_' + id)) {
            callUrl("https://api.spotify.com/v1/albums/" + id, {}, function (data) {
                //console.log(data);
                Session.set('album_details_' + id, data);
            });
        }
        var image = false;
        if (this.images) {
            _.each(this.images, function (img) {
                if (img.url) {
                    image = img;
                }
            });
        }
        return image;
    },
    album_details: function () {
        var id = this.id;
        return Session.get('album_details_' + id);
    },
    active: function () {
        var album = Session.get('selected_album');
        return album && album.items && this.id === album.items[0].id ? "active" : "";
    },
    external_ids: function () {
        var ids = [];
        _.each(this.external_ids, function (id, key) {
            ids.push({id: id, key: key});
        });
        return ids;
    },
    release_year: function () {
        var id = this.id;
        var album_details = Session.get('album_details_' + id);
        if (album_details && album_details.release_date) {
            return ' (' + moment(album_details.release_date, 'YYYY-MM-DD').format('YYYY') + ')';
        }
    }
});

Template.track_list.helpers({
    image: function () {
        var id = this.id;
        if (!Session.get('track_details_' + id)) {
            callUrl("https://api.spotify.com/v1/tracks/" + id, {}, function (data) {
                //console.log(data);
                Session.set('track_details_' + id, data);
            });
        }
        var image = false;
        var albums = Session.get('albums');
        if (albums && albums.items) {
            var selected_album = Session.get('selected_album');
            _.each(albums.items, function (album) {
                if (selected_album && selected_album.items && album.id === selected_album.items[0].id) {
                    _.each(album.images, function (img) {
                        if (img.url) {
                            image = img;
                        }
                    });
                }
            });
        }
        return image;
    },
    track_details: function () {
        var id = this.id;
        return Session.get('track_details_' + id);
    },
    external_ids: function () {
        var ids = [];
        _.each(this.external_ids, function (id, key) {
            ids.push({id: id, key: key});
        });
        return ids;
    }
});

Template.track_list.events({
    'click .track-image': function (e) {
        e.preventDefault();
        var id = e.currentTarget.offsetParent.id;
        var target = e.currentTarget;
        var playingCssClass = 'playing';
        if (target !== null && target.classList.contains('track-image')) {
            if (target.classList.contains(playingCssClass)) {
                audioObject.pause();
            } else {
                if (audioObject) {
                    audioObject.pause();
                }
                var track_details = Session.get('track_details_' + id);
                if (track_details && track_details.preview_url) {
                    audioObject = new Audio(track_details.preview_url);
                    audioObject.play();
                    target.classList.add(playingCssClass);
                    audioObject.addEventListener('ended', function () {
                        target.classList.remove(playingCssClass);
                    });
                    audioObject.addEventListener('pause', function () {
                        target.classList.remove(playingCssClass);
                    });
                } else {
                    swal('No preview available for this track.');
                }
            }
        }
    },
    "click .artist-label": function (e) {
        e.preventDefault();
        Session.set('selected_artist');
        Session.set('selected_album');
        searchArtist(e.target.id);
    }
});
