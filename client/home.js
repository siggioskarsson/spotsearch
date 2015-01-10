var audioObject = null;

Template.searchbox.events({
  "click .info": function(e) {
    e.preventDefault();
    if (Session.get('showInfo')) {
      Session.set('showInfo');
    } else {
      Session.set('showInfo', true);
    }
  },
  "focus .search": function(e) {
    Session.set('compact_results', true);
    Session.set('search_results_show', true);
  },
  "blur .search": function(e) {
    Meteor.setTimeout(function() {
      Session.set('search_results_show', false);
      Session.set('compact_results', false);
    },200);
  },
  "keyup .search": function(e) {
      $.get("https://api.spotify.com/v1/search?q=" + $('.search').val() + "&type=artist,album&limit=10", {}, function (data) {
          //console.log(data);
          Session.set('search_results', data);
      });
  },
  "keyup .artist": function(e) {
    if (e.keyCode == 13) {
      // https://api.spotify.com/v1/search?q=tania%20bowra&type=artist
      $.get("https://api.spotify.com/v1/search?q=" + $('.artist').val() + "&type=artist&limit=50", {}, function (data) {
          //console.log(data);
          Session.set('artists', data.artists);
          Session.set('selected_artist');
          Session.set('albums');
          Session.set('album_selected');
          Session.set('tracks');
      });
    }
  },
  "keyup .album": function(e) {
    if (e.keyCode == 13) {
      // https://api.spotify.com/v1/search?q=tania%20bowra&type=artist
      $.get("https://api.spotify.com/v1/search?q=" + $('.album').val() + "&type=album&limit=50", {}, function (data) {
          //console.log(data);
          Session.set('artists');
          Session.set('selected_artist');
          Session.set('albums', data.albums);
          Session.set('album_selected');
          Session.set('tracks');
      });
    }
  }
});

Template.artist_list.events({
  "click .artist": function(e) {
    e.preventDefault();
    // console.log(e, e.currentTarget.id);
    var id = e.currentTarget.id;
    var artists = Session.get('artists');
    if (!artists) {
      // check whether we are in the search box
      var search_results = Session.get('search_results');
      if (search_results.artists) {
        artists = search_results.artists;
      }
    }
    if (id && artists && artists.items) {
      _.each(artists.items, function(artist) {
          if (artist.id === id) {
            Session.set('selected_artist', {items: [artist]});
          }
      });
    }
    // https://api.spotify.com/v1/artists/{id}/albums
    $.get("https://api.spotify.com/v1/artists/" + id + "/albums", {}, function (data) {
        //console.log(data);
        Session.set('artists');
        Session.set('albums', data);
        Session.set('selected_album');
        Session.set('tracks');
    });
  }
});

Template.artist_list.helpers({
  image: function() {
    var image = false;
    if (this.images) {
      _.each(this.images, function(img) {
          if(img.url) {
            image = img;
          }
      });
    }
    return image;
  }
});

Template.album_list.events({
  "click .artist_album": function(e) {
    e.preventDefault();
    // console.log(e, e.currentTarget.id);
    var id = e.currentTarget.id;
    Session.set('album_selected', id);
    var albums = Session.get('albums');
    if (!albums || Session.get('compact_results')) {
      // check whether we are in the search box
      var search_results = Session.get('search_results');
      if (search_results.albums) {
        Session.set('albums', search_results.albums);
        Session.set('artists');
        Session.set('selected_artist');
      }
    }
    if (id && albums && albums.items) {
      _.each(albums.items, function(album) {
          if (album.id === id) {
            Session.set('selected_album', {items: [album]});
          }
      });
    }
    // https://api.spotify.com/v1/artists/{id}/albums
    $.get("https://api.spotify.com/v1/albums/" + id + "/tracks", {}, function (data) {
        //console.log(data);
        Session.set('tracks', data);
    });
  }
});

Template.album_list.helpers({
  image: function() {
    var id = this.id;
    if (!Session.get('album_details_' + id)) {
      $.get("https://api.spotify.com/v1/albums/" + id, {}, function (data) {
          //console.log(data);   
          Session.set('album_details_' + id, data);
      });
    }
    var image = false;
    if (this.images) {
      _.each(this.images, function(img) {
          if(img.url) {
            image = img;
          }
      });
    }
    return image;
  },
  album_details: function() {
    var id = this.id;
    return Session.get('album_details_' + id);
  },
  active: function() {
    return this.id === Session.get('album_selected') ? "active" : "";
  },
  external_ids: function() {
    var ids = [];
    _.each(this.external_ids, function(id, key) {
        ids.push({id: id, key: key});
    });
    return ids;
  },
  release_year: function() {
    var id = this.id;
    var album_details = Session.get('album_details_' + id);
    if (album_details && album_details.release_date) {
      return ' (' + moment(album_details.release_date, 'YYYY-MM-DD').format('YYYY') + ')';
    }
  }
});

Template.track_list.helpers({
  image: function() {
    var id = this.id;
    if (!Session.get('track_details_' + id)) {
      $.get("https://api.spotify.com/v1/tracks/" + id, {}, function (data) {
          //console.log(data);   
          Session.set('track_details_' + id, data);     
      });
    }
    var image = false;
    var albums = Session.get('albums');
    if (albums && albums.items) {
      _.each(albums.items, function(album) {
          if(album.id === Session.get('album_selected')) {
            _.each(album.images, function(img) {
                if(img.url) {
                  image = img;
                }
            });
          }
      });
    }
    return image;
  },
  track_details: function() {
    var id = this.id;
    return Session.get('track_details_' + id);
  },
  external_ids: function() {
    var ids = [];
    _.each(this.external_ids, function(id, key) {
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
          alert('No preview available for this track.');
        }
      }
    }
  }
});
