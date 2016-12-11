/**
 * Created by siggi.oskarsson on 11/12/16.
 */
Meteor.methods({
    getSpotifyClientId: function() {
        return Meteor.settings.spotify.clientId;
    }
});
