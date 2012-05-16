define([
  "jquery",
  "backbone",
  "underscore",
  "marionette",
  "text!templates/nowplaying-popover.html",
  "text!templates/nowplaying-popover-lastfm.html",
  "bootstrap", // no need for arg
  "gaq"
  ], function($, Backbone, _, Marionette, PopoverTemplate, PopoverContentTemplate) {

  var LastFmPopoverView = Backbone.Marionette.ItemView.extend({

    template: PopoverContentTemplate,
    popoverTemplate: PopoverTemplate,

    initialize: function(options) {
      this.vent = options.vent;
      this.bindTo(this.vent, "nowplaying:lastfm:popover:toggle", this.toggle, this);
    },
    serializeData: function() {
      var lastFmCollection = this.model.getLastFmCollection();

      return _.chain(lastFmCollection.models)
        .filter(function(model) {
          return _.any(["album", "artist"], function(entity) {
            return model.get("entity") === entity;
          });
        })
        .sortBy(function(model) {
          return (model.get("entity") === "artist");
        })
        .map(function(model) {
          return {
            entity: model.get("entity"),
            name: model.get("name"),
            url: model.get("url"),
            image: model.getImageBySize(["medium"]),
            summary: model.get("summary")
          };
        })
        .value();
    },
    renderHtml: function(json) {
      return Backbone.Marionette.Renderer.render(this.template, {model: json});
    },
    render: function() {
      var $targetEl = $(this.el),
        json = this.serializeData(),
        self = this,
        popover;

      if (_.isArray(json) && json.length > 0) {
        $.when(this.renderHtml(json))
          .done(function(html) {
            popover = $targetEl.data("popover");
            if (popover !== undefined) {
              popover.options.content = function() {
                return html;
              };
            } else {
              $targetEl.popover({
                content: function() {
                  return html;
                },
                placement: "bottom",
                trigger: "manual",
                template: self.popoverTemplate
              });
            }
            self.vent.trigger("nowplaying:lastfm:popover:enabled", {
              target: $targetEl,
              model: self.model
            });
          });
      }
    },
    toggle: function() {
      var $el = $(this.el);
      var popover = $el.data("popover");
      if (popover) {
        $(this.el).popover("toggle");
        if (popover.enabled) {
          _gaq.push(["_trackEvent", "LastFm", "click"]);
          popover.$tip.find(".close").click(function() {
            popover.hide();
          });
        }
      }
    },
    close: function() {
      // Very important we do not delete the views el as we are only touch the popover data blob
      // We must override other prototype will remove element
      
      this.unbindAll();
      this.unbind();

      var data = $(this.el).data();
      if (data && data.popover) {
        delete data.popover;
      }
    }
  });
  return LastFmPopoverView;
});