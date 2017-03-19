'use strict';

const helpers = require('../../../shared/helpers');

// Precondition on the availability of the helpers

if(!helpers.motifTagging ||
   typeof(helpers.motifTagging.addTag) !== 'function' ||
   typeof(helpers.motifTagging.removeTag) !== 'function' ||
   typeof(helpers.motifTagging.removeVisionTag) !== 'function') {
  throw new Error('Missing helpers.motifTagging.* helpers');
}

const ADD_MOTIF_TAG_SELECTOR = '[data-action="add-motif-tag"]';
const CANCEL_MOTIF_TAGS_SELECTOR = '[data-action="cancel-motif-tags"]';
const EDIT_MOTIF_TAGS_SELECTOR = '[data-action="edit-motif-tags"]';
const SAVE_MOTIF_TAGS_SELECTOR = '[data-action="save-motif-tags"]';
const TRANSFER_TAG_INPUT_SELECTOR = '[data-action="transfer-motif-tag"]';
const REMOVE_TAG_INPUT_SELECTOR = '[data-action="remove-motif-tag"]';

const ADD_TAG_INPUT_SELECTOR = '.motif-tagging__add-input input';

const motifTaggingTemplate = require('views/includes/motif-tagging');

(function($) {

  class MotifTaggingController {

    constructor($motifTagging) {
      this.$motifTagging = $motifTagging;
      this.state = {
        editing: false,
        saving: false,
        metadata: {}
      };
      // Register the listeners
      this.registerListeners();
    }

    render() {
      const markup = motifTaggingTemplate(this.state);
      this.$motifTagging.html(markup);

      const $input = this.$motifTagging.find(ADD_TAG_INPUT_SELECTOR);
      this.bindTypeahead($input);
    }

    edit() {
      // Fetch the current metadata when editing
      $.getJSON(location.pathname + '/json', (metadata) => {
        // Fetch and override the metadata
        this.state.metadata = metadata;
        // Mutate the state
        this.state.editing = true;
        // Re-render the motif-tagging template
        this.render();
      });
    }

    addTagFromInput() {
      const $input = this.$motifTagging.find(ADD_TAG_INPUT_SELECTOR);
      // Read the value of the input field
      const tag = $input.val();
      // Then clear it
      $input.val('');
      // Add it
      this.addTag(tag);
    }

    addTag(tag) {
      // Don't do anything with an undefined, null or empty tag
      if(!tag || tag === '') {
        return;
      }
      // Add it to the metadata
      helpers.motifTagging.addTag(this.state.metadata, tag);
      // Re-render the motif-tagging template
      this.render();
    }

    removeTag(tag) {
      // Remove it from the metadata
      helpers.motifTagging.removeTag(this.state.metadata, tag);
      helpers.motifTagging.removeVisionTag(this.state.metadata, tag);
      // Re-render the motif-tagging template
      this.render();
    }

    cancel() {
      // Fetch the current metadata when editing
      $.getJSON(location.pathname + '/json', (metadata) => {
        // Fetch and override the metadata
        this.state.metadata = metadata;
        // Mutate the state
        this.state.editing = false;
        // Re-render the motif-tagging template
        this.render();
      });
    }

    save() {
      // Don't save twice
      if(this.state.saving) {
        return;
      }
      // Add any tag which has not been added
      this.addTagFromInput();
      this.state.saving = true;
      this.render();
      const url = location.pathname + '/save-motif-tags';
      $.post(url, this.state.metadata, (metadata) => {
        // Once the metadata is back, override it and stop saving
        this.state.metadata = metadata;
        this.state.saving = false;
        this.state.editing = false;
        this.render();
      }, 'json');
    }

    registerListeners() {
      // When clicking the edit button
      this.$motifTagging.on('click', EDIT_MOTIF_TAGS_SELECTOR, () => {
        this.edit();
      });
      // When clicking the edit button, motif-tagging template is re-rendered
      this.$motifTagging.on('click', ADD_MOTIF_TAG_SELECTOR, () => {
        this.addTagFromInput();
      });
      // When clicking the edit button, motif-tagging template is re-rendered
      this.$motifTagging.on('click', CANCEL_MOTIF_TAGS_SELECTOR, () => {
        this.cancel();
      });
      // When clicking the edit button, motif-tagging template is re-rendered
      this.$motifTagging.on('click', SAVE_MOTIF_TAGS_SELECTOR, () => {
        this.save();
      });
      // When hitting enter in the input field, we add the tag
      this.$motifTagging.on('keyup', ADD_TAG_INPUT_SELECTOR, (event) => {
        if (event.keyCode === 13) {
          this.addTagFromInput();
          // Put the focus back into the input
          this.$motifTagging.find(ADD_TAG_INPUT_SELECTOR).focus();
        }
      });
      // When clicking the thumbs up on a vision tag, add it
      this.$motifTagging.on('click', TRANSFER_TAG_INPUT_SELECTOR, (event) => {
        const tag = $(event.target).closest('[data-tag]').data('tag');
        this.addTag(tag);
        // Let's not make this a click on the actual tag
        event.preventDefault();
      });
      // When clicking the cross on a vision tag, remove it
      this.$motifTagging.on('click', REMOVE_TAG_INPUT_SELECTOR, (event) => {
        const tag = $(event.target).closest('[data-tag]').data('tag');
        this.removeTag(tag);
        // Let's not make this a click on the actual tag
        event.preventDefault();
      });
    }

    bindTypeahead($input) {
      // Construct a source for tags
      const tagsSource = new Bloodhound({
        datumTokenizer: function(tags) {
          return Bloodhound.tokenizers.whitespace(tags);
        },
        queryTokenizer: Bloodhound.tokenizers.whitespace,
        remote: {
          url: '/motif-tag-suggestions?text=%QUERY',
          wildcard: '%QUERY',
          cache: false
        }
      });

      // Initialize the source of tags
      tagsSource.initialize();

      // And bind it on the input field
      $input.typeahead({
        hint: false,
        highlight: true,
        minLength: 1
      }, {
        name: 'tags',
        source: tagsSource
      });

      // When the input is focussed, add a class to the parent
      $input.on('focus', function() {
        $input.parent('.twitter-typeahead').addClass('focussed');
      });

      // When the input is empty and blurred, remove the class again
      $input.on('blur', function() {
        if($input.val() === '') {
          $input.parent('.twitter-typeahead').removeClass('focussed');
        }
      });
    }
  }

  // Initialize motif tagging for every .motif-tagging element on the page
  $(() => {
    $('.motif-tagging').each((index, motifTagging) => {
      const $motifTagging = $(motifTagging);
      // Initialize a controller
      const controller = new MotifTaggingController($motifTagging);
    });
  });
})(jQuery);
