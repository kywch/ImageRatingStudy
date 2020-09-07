/**
 * jspsych-image-rating
 * Kyoung Whan Choe (https://github.com/kywch/)
 *
 * plugin for showing multiple images for efficient rating
 *
 **/

jsPsych.plugins['image-rating'] = (function () {

  jsPsych.pluginAPI.registerPreload('image-rating', 'stimuli', 'image');

  var plugin = {};

  plugin.info = {
    name: 'image-rating',
    description: '',
    parameters: {
      prompt_header: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt header',
        description: 'Description of the current task'
      },
      prompt_footer: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Prompt footer',
        description: 'Trial-related details'
      },
      image_array: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Image array',
        array: true,
        default: undefined,
        description: 'A matrix of image ids that match the stimuli -- the data will be saved using this'
      },
      stimuli: {
        type: jsPsych.plugins.parameterType.IMAGE,
        pretty_name: 'Stimuli',
        array: true,
        default: undefined,
        description: 'An array that defines a grid.'
      },
      record_mouse: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Record mouse',
        default: false,
        description: 'Whether to record mouse trajectory'
      },
      attention_check: {
        type: jsPsych.plugins.parameterType.STRING,
        pretty_name: 'Attention check',
        default: '',
        description: 'The image that participants should drag to the trashcan'
      },
      image_size: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Image size',
        array: true,
        default: [280, 210],
        description: 'Array specifying the width and height of the images to show.'
      },
      trial_duration: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Trial duration',
        default: 10000,
        description: 'How long to show the stimulus for in milliseconds.'
      },
      required_clicks: {
        type: jsPsych.plugins.parameterType.INT,
        pretty_name: 'Required clicks',
        default: 1,
        description: 'The number of click one should make to proceed'
      },
      practice_flag: {
        type: jsPsych.plugins.parameterType.BOOL,
        pretty_name: 'Practice flag',
        default: false,
        description: 'If true, one can only proceed after draging the blurry image to the trashcan'
      },
      trash_can: {
        type: jsPsych.plugins.parameterType.IMAGE,
        pretty_name: 'Trash can',
        default: "https://kywch.github.io/ImageRatingStudy/lib/trashcan2.png",
        description: 'Trash can image url. If empty, it will not show the trash can.'
      }
    }
  }

  plugin.trial = function (display_element, trial) {

    // make sure that it is using the fullscreen mode
    var element = document.documentElement;
    var reset_fullscreen = false;
    if (element.requestFullscreen) {
      element.requestFullscreen();
      reset_fullscreen = true;
    } else if (element.mozRequestFullScreen) {
      element.mozRequestFullScreen();
      reset_fullscreen = true;
    } else if (element.webkitRequestFullscreen) {
      element.webkitRequestFullscreen();
      reset_fullscreen = true;
    } else if (element.msRequestFullscreen) {
      element.msRequestFullscreen();
      reset_fullscreen = true;
    }

    display_element.innerHTML = plugin.generate_stimulus(trial.prompt_header, trial.prompt_footer,
      trial.stimuli, trial.image_array, trial.image_size, trial.trash_can);

    var trial_onset = performance.now();

    // attach event listener for each image
    var click_history = [];
    var flag_warning = false;

    function imgClickListener(evt) {
      if (trial.required_clicks == 1) {
        // any clicks on the image first resets the borders of every image
        var nrows = trial.image_array.length;
        var ncols = trial.image_array[0].length;
        for (var row = 0; row < nrows; row++) {
          for (var col = 0; col < ncols; col++) {
            document.getElementById('img-' + trial.image_array[row][col]).style.border = "";
          }
        }
      }
      // proceed to the clicked image
      var image_id = this.id;
      border = document.getElementById(image_id).style.border;
      if (border == "3px solid magenta") {
        document.getElementById(image_id).style.border = "";
        click_history.push({
          "rt": Math.round(performance.now() - trial_onset),
          "image": image_id,
          "oper": -1
        });
        if (flag_debug) {
          console.log("Image " + image_id + " was de-selected. ", click_history);
        }
      } else {
        document.getElementById(image_id).style.border = "3px solid magenta";
        click_history.push({
          "rt": Math.round(performance.now() - trial_onset),
          "image": image_id,
          "oper": 1
        });
        if (flag_debug) {
          console.log("Image " + image_id + " was selected.", click_history);
        }
      }
    }

    var nrows = trial.image_array.length;
    var ncols = trial.image_array[0].length;
    for (var row = 0; row < nrows; row++) {
      for (var col = 0; col < ncols; col++) {
        document.getElementById('img-' + trial.image_array[row][col]).addEventListener('click', imgClickListener);
      }
    }

    function btnListener(evt) {
      if (this.id === "jspsych-multi-rating-next") {
        endTrial(evt);
      }
    }

    jsPsych.pluginAPI.setTimeout(function () {
      document.querySelector("#jspsych-multi-rating-button").insertAdjacentHTML('afterBegin',
        '<button id="jspsych-multi-rating-next" class="jspsych-btn" style="margin-left: 5px;">Submit</button></div>');
      display_element.querySelector('#jspsych-multi-rating-next').addEventListener('click', btnListener);
    }, trial.trial_duration);

    // activate the mouse tracking
    var mouse_track = [];

    function record_mousepos(e) {
      var width_cnt = window.innerWidth / 2;
      var height_cnt = window.innerHeight / 2;
      var curr_smp = [Math.round(performance.now() - trial_onset), (e.pageX - width_cnt), (e.pageY - height_cnt), 0];
      if (flag_debug) {
        console.log("mouse: ", curr_smp);
      }
      mouse_track.push(curr_smp);
    }

    function record_mousedown(e) {
      var width_cnt = window.innerWidth / 2;
      var height_cnt = window.innerHeight / 2;
      var curr_smp = [Math.round(performance.now() - trial_onset), (e.pageX - width_cnt), (e.pageY - height_cnt), 1];
      if (flag_debug) {
        console.log("mouse: ", curr_smp);
      }
      mouse_track.push(curr_smp);
    }
    jQuery(document).mousemove(record_mousepos);
    jQuery(document).mousedown(record_mousedown);

    function endTrial(evt) {

      // find the clicked images and returns the list
      var clicked = [];
      var trashed = [];
      var nrows = trial.image_array.length;
      var ncols = trial.image_array[0].length;
      for (var row = 0; row < nrows; row++) {
        for (var col = 0; col < ncols; col++) {
          border = document.getElementById('img-' + trial.image_array[row][col]).style.border;
          if (border == "3px solid magenta") {
            clicked.push(trial.image_array[row][col]);
          }
          oppa = document.getElementById('img-' + trial.image_array[row][col]).style.opacity;
          if (oppa == .3) {
            trashed.push(trial.image_array[row][col]);
          }
        }
      }
      if (flag_debug) {
        console.log("Clicked images: ", clicked);
      }

      if (clicked.length != trial.required_clicks) {
        flag_warning = true;
        alert('You must select ' + trial.required_clicks + ' image(s) to proceed.');
        return;
      }

      // attention check
      var flag_attention = true;
      if (trial.attention_check.length > 0) {
        var loc = trashed.indexOf(trial.attention_check);
        if (loc < 0) {
          flag_attention = false;
        }
      }

      if (trial.practice_flag == true && flag_attention == false) {
        flag_warning = true;
        alert('ATTENTION! You must find and drag the blurry image to the trash can.');
        return;
      }

      display_element.innerHTML = '';

      var trial_data = {
        "fullscreen_reset": reset_fullscreen,
        "image_array": trial.image_array,
        "clicked": clicked,
        "trashed": trashed,
        "attention_check": trial.attention_check,
        "flag_attention": flag_attention,
        "flag_warning": flag_warning,
        "click_history": click_history,
        "rt": Math.round(performance.now() - trial_onset)
      };
      if (trial.record_mouse) {
        trial_data['mouse_track'] = mouse_track;
      }

      // removing event handlers
      evt.target.removeEventListener('click', btnListener);
      jQuery(document).off("mousemove", record_mousepos);
      jQuery(document).off("mousedown", record_mousedown);
      jsPsych.finishTrial(trial_data);
    }

  };

  plugin.generate_stimulus = function (prompt_header, prompt_footer, pattern, image_array, image_size, trash_can) {
    var nrows = pattern.length;
    var ncols = pattern[0].length;

    // create blank element to hold code that we generate
    var html = '<div id="jspsych-multi-rating-trial-dummy" css="display: none;">';

    // create table for displaying the prompt
    html += '<table id="header"><tr style="vertical-align:middle">';
    html += '<td align=center style="width:1148px;height:55px;line-height:2.1em">' + prompt_header + '</td></tr></table>';

    // create table for holding images
    html += '<table id="jspsych-multi-rating-trial-table" ' +
      'style="border-collapse: collapse; margin-left: auto; margin-right: auto;">';

    for (var row = 0; row < nrows; row++) {
      html += '<tr id="jspsych-multi-rating-trial-table-row-' + row + '" css="height: ' + image_size[1] + 'px;">';

      for (var col = 0; col < ncols; col++) {
        html += '<td id="jspsych-multi-rating-trial-table-' + row + '-' + col + '" ' + 'style="border: 0px solid #555;">' +
          '<div id="jspsych-multi-rating-trial-table-cell-' + row + '-' + col + '" style="width: ' + (image_size[0] + 4) + 'px; height: ' + (image_size[1] + 4) + 'px; padding: 2px;">';
        if (pattern[row][col] !== 0) {
          html += '<img id="img-' + image_array[row][col] + '" ' +
            'src="' + pattern[row][col] + '" style="width: ' + image_size[0] + 'px; height: ' + image_size[1] + 'px;" draggable="true" ' +
            'ondragstart="(function (evt) { evt.dataTransfer.setData(&quot;Text&quot;, evt.target.id); })(event)"></img>';
        }
        html += '</div>';
        html += '</td>';
      }
      html += '</tr>';
    }

    html += '</table>';

    // create table for displaying the title
    html += '<table id="header"><tr style="vertical-align:middle">';

    // trash can-related html and inline scripts
    if (trash_can) {
      html += '<td style="width:282px;height:57px"><div id="jspsych-multi-rating-trash" ' +
        'ondrop="(function (evt) { event.preventDefault(); var image_id = event.dataTransfer.getData(&quot;Text&quot;); ' +
        'document.getElementById(image_id).style.opacity = .3; })(event)" ' +
        'ondragover="(function (evt) { evt.preventDefault(); })(event)">' +
        '<img src="' + trash_can + '" height="55px" align="middle"></div></td>';
      // prompt and the next button
      html += '<td style="width:584px">' + prompt_footer + '</td>' +
        '<td style="width:282px"><div id="jspsych-multi-rating-button"></div></td></tr></table>';
    } else {
      html += '<td style="width:400px;height:57px"><div>&nbsp</div></td>' +
        '<td style="width:348px"><div id="jspsych-multi-rating-button"></div></td>' +
        '<td style="width:400px"><div align="right">' + prompt_footer + '</div></td></tr></table>';
    }

    html += '</div>';

    return html;
  };

  return plugin;
})();
