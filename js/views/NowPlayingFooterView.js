define([
  "jquery",
  "underscore",
  "marionette-kexp",
  "text!templates/nowplaying-footer.html",
  "moment",
  "jquery-ui", // no need for arg
  "jquery-kexp", // no need for arg
  "bootstrap" // no need for arg
  ], function($, _, Marionette, ViewTemplate) {
  
  var NowPlayingFooterView = Marionette.ItemView.extend({
    template: ViewTemplate,
    className: "container-nowplaying-footer",
    initialize: function(options) {
      options || (options = {});
      this.collection = this.model.collection;
      this.lastFmConfig = this.appConfig.getLastFm();
      this.pager = options.pager || {canPagePrev: false, canPageNext:  false};
    },
    initialEvents: function() {
      this.bindTo(this.vent, "nowplaying:lastfm:popover:enabled", this.showLastFmButton, this);
      this.bindTo(this.vent, "nowplaying:refresh:background", this.handleBackgroundRefresh, this);
      this.bindTo(this.vent, "lastfm:track:love:success", this.showShareAnimation, this);
      this.bindTo(this.vent, "nowplaying:like", this.handleLikeCountChange, this);
      this.bindTo(this.lastFmConfig, "change:sessionKey", this.handleLastFmShareChange, this);
      this.bindTo(this.lastFmConfig, "change:likeShareEnabled", this.handleLastFmShareChange, this);
      this.bindTo(this.lastFmConfig, "change:likeScrobbleEnabled", this.handleLastFmShareChange, this);
    },
    events: {
      "click #button-like": "handleLike",
      "click #button-lastfm": "handleLastFmPopoverToggle",
      "click #button-refresh": "handleRefresh",
      "click #button-page-prev.active": "handlePagePrev",
      "click #button-page-next.active": "handlePageNext"
    },
    tooltips: {
      "#button-spotify" : "tooltip",
      "#button-refresh" : "tooltip",
      "#button-share" : "tooltip"
    },
    serializeData: function() {
      return {
        model: {
          id: this.model.id,
          airBreak: this.model.get("airBreak"),
          likeCount: this.model.hasLikedSong() ? this.model.likedSong.get("likeCount") : 0,
          likeShareEnabled: this.lastFmConfig.hasSharingEnabled(),
          pager: this.pager
        }
      };
    },
    onRender: function() {
      var view = this;

      $(this.el)
        .find("#button-spotify")
          .attr("href", view.model.toSpotifyUrl())
            .tooltip({
              placement: "top",
              title: "Searches Spotify (requires Spotify app and access to launch from web)"
            });
      if (_.isDate(view.model.get("timeLastUpdate"))) {
        $(this.el)
          .find("#button-refresh")
            .tooltip({
              placement: "top",
              title: function() {
                return "Last Update: " + moment.utc(view.model.get("timeLastUpdate")).local().format("M/D/YYYY h:mm:ss A");
              }
            });
      }
      $(this.el)
        .find("#button-share")
          .tooltip({
            placement: "top",
            title: function() {
              return view.lastFmConfig.hasSharingEnabled() ?
                view.lastFmConfig.isLikeShareEnabled() && view.lastFmConfig.isLikeScrobbleEnabled() ?
                  "<strong>Last.fm Sharing Enabled</strong> - Likes will be shared to your Last.fm profile as 'loves' & 'listens' (See Options)" :
                  (view.lastFmConfig.isLikeShareEnabled() ?
                    "<strong>Last.fm Sharing Enabled</strong> - Likes will be shared to your Last.fm profile as 'loves' (See Options)" :
                    "<strong>Last.fm Sharing Enabled</strong> - Likes will be shared to your Last.fm profile as 'listens' (See Options)") :
                "<strong>Last.fm Sharing Disabled</strong> - Likes will only be locally stored and not shared with your Last.fm profile (See Options)";
            }
          });
    },
    onShow: function() {
      var $footer = $(this.el).find("#song-footer");
      _.delay(function() {
        $footer.addClass("in");
      });

    },
    showRefreshAnimation: function() {
      var $icon = $("#button-refresh", this.$el).removeClass("rotate");
      _.delay(function() {
        $icon.addClass("rotate");
      });
    },
    showShareAnimation: function() {
      var $icon = $("#button-share", this.$el).removeClass("pulse");
      _.delay(function() {
        $icon.addClass("pulse");
      });
    },
    showLastFmButton: function() {
      var $button = $("#button-lastfm", this.$el).removeClass("hide").addClass("fade");
      _.delay(function() {
        $button.addClass("in");
      });
    },
    handleLike: function(event) {
      var modelId = $(event.currentTarget).attr("data-id"),
        targetModel = this.collection.get(modelId),
        likedSong, lastfmAttributes;

      if (_.isUndefined(targetModel)) return;

      likedSong = targetModel.likedSong || targetModel.toSong();
      likedSong.like();
      likedSong.setLastFmAttributes(targetModel.lastFmMeta);

      if (likedSong.isNew()) {
        likedSong.save();
        targetModel.likedSong = likedSong;
      } else {
        likedSong.save();
      }

      if (!_.isEmpty(likedSong.get("trackDownloadUrl"))) {
        this.vent.trigger("notification:info", "You can find the download link in the song info popover in your liked song collection.",
          "This song has a free download!");
      }

      this.vent.trigger("analytics:trackevent", "NowPlaying", "Like", targetModel.toDebugString(), likedSong.get("likeCount"));
      this.vent.trigger("nowplaying:like", targetModel);
    },
    handleBackgroundRefresh: function() {
      $("#button-refresh", this.$el).tooltip("hide");
      this.showRefreshAnimation();
    },
    handleRefresh: function(event) {
      this.vent.trigger("analytics:trackevent", "NowPlaying", "Refresh", "Manual");
      this.handleBackgroundRefresh();
      
      this.vent.trigger("nowplaying:refresh:manual");
    },
    handleLikeCountChange: function(model) {
      $(".badge", this.$el).toggleClass("badge-zero", false).text(model.likedSong.get("likeCount"));
    },
    handleLastFmPopoverToggle: function() {
      this.vent.trigger("nowplaying:lastfm:popover:toggle", this.model);
    },
    handleLastFmShareChange: function(model, value, options) {
      $("#button-share", this.$el).toggleClass("active", model.hasSharingEnabled());
    },
    handlePagePrev: function() {
      this.vent.trigger("nowplaying:page:prev", this.model);
    },
    handlePageNext: function() {
      this.vent.trigger("nowplaying:page:next", this.model);
    },
    beforeClose: function() {
      
      var fadeDfr = $.Deferred();
      $(this.el).find("#song-footer")
        .queueTransition(function() {
          fadeDfr.resolve();
        }).removeClass("in");

      return fadeDfr.promise();
    }
  });
  return NowPlayingFooterView;
});