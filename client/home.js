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

Template.results.helpers({
  selected_artist: function() {
    return Session.get('selected_artist');
  },
  artists: function() {
    return Session.get('artists');
  },
  albums: function() {
    return Session.get('albums');
  },
  tracks: function() {
    return Session.get('tracks');
  }
});

Template.artist_list.events({
  "click .artist": function(e) {
    e.preventDefault();
    // console.log(e, e.currentTarget.id);
    var id = e.currentTarget.id;
    var artists = Session.get('artists');
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
        audioObject = new Audio(track_details.preview_url);
        audioObject.play();
        target.classList.add(playingCssClass);
        audioObject.addEventListener('ended', function () {
          target.classList.remove(playingCssClass);
        });
        audioObject.addEventListener('pause', function () {
          target.classList.remove(playingCssClass);
        });
      }
    }
  }
});
