Qualtrics.SurveyEngine.addOnload(function () {

    // Retrieve Qualtrics object and save in qthis
    var qthis = this;

    // Hide buttons
    qthis.hideNextButton();

    // define & load required resources for this study
    var cdn_url = "https://cdn.jsdelivr.net/gh/kywch/ImageRatingStudy@master/lib/";
    var dev_url = "https://users.rcc.uchicago.edu/~kywch/ImageRatingStudy/lib/";

    var jsPsychResources = [
        "https://cdnjs.cloudflare.com/ajax/libs/dropbox.js/4.0.30/Dropbox-sdk.min.js", // for saving to dropbox
        cdn_url + "jspsych.js",
        cdn_url + "jspsych-fullscreen.js",
        cdn_url + "jspsych-instructions.js",
        cdn_url + "jspsych-multi-rating.js",
        dev_url + "image-rating_main.js"
    ];

    function loadScript(idx) {
        console.log("Loading ", jsPsychResources[idx]);
        jQuery.getScript(jsPsychResources[idx], function () {
            if ((idx + 1) < jsPsychResources.length) {
                loadScript(idx + 1);
            } else {
                initExp();
            }
        });
    }

    if (window.Qualtrics && (!window.frameElement || window.frameElement.id !== "mobile-preview-view")) {
        loadScript(0);
    }

    // set the display stage
    jQuery('<div class = display_stage_background></div>').appendTo('body');
    jQuery('<div class = display_stage></div>').appendTo('body');

    function initExp() {
        // get participant id
        sbjId = "${e://Field/workerId}";
        sbjId = sbjId.trim();
        if (sbjId.length == 0) {
            console.log("No participant id. Stopping the experiment.");
            //return false;
        }

        // main_seq must have been successfully loaded
        task_id = "pair";

        // Dropbox-related variables
        // YOU MUST GET YOUR OWN DROPBOX ACCESS TOKEN for uploading the file to your dropbox
        // from https://dropbox.github.io/dropbox-api-v2-explorer/#files_upload
        dropbox_access_token = '';
        // the data_folder below should be replaced with the actual data folder
        save_filename = '/data_folder/' + task_id + '_' + sbjId + '.json';

        var prac_img_src = 'https://raw.githubusercontent.com/kywch/ImageRatingStudy/master/images_prac/';
        var main_img_src = 'https://raw.githubusercontent.com/kywch/ImageRatingStudy/master/images_main/';
        var img_ext = 'jpg';

        // instruction should match the task prompt
        var instr_url = 'https://raw.githubusercontent.com/kywch/ImageRatingStudy/master/instructions/pairwise/';
        var instr_imglist = get_instruction_imglist(instr_url, 6);

        // required clicks should be four
        var task_prompt = 'Select one image that you like better.';

        // The prefix of the images should be passed along
        function generate_pair_seq(prefix) {
            /*
                Preparing 24 pair-wise rating trials
                Input: 46 images
                Output: 23 image pairs without any attention check trials
            */
            var attn_idx = 99;
            var pair_seed = shuffle(range(1, 46));

            if (prefix == 'prac') {
                // sequence for the practice. prepare 6 trials
                var pair_seed2 = pair_seed.slice(0, 12);
                pair_seed2.reshape(6, 2);
                /*
                pair_seed2[4][0] = attn_idx;
                pair_seed2[5][1] = attn_idx;
                pair_seed2[6][0] = attn_idx;
                pair_seed2[7][1] = attn_idx;
                */
                pair_seed2 = shuffle(pair_seed2);
            } else {
                /*
                var pair_seed2 = shuffle(pair_seed.slice(0, 23).concat(attn_idx));
                pair_seed2 = pair_seed2.concat(shuffle(pair_seed.slice(23, 46).concat(attn_idx)));
                */
                var pair_seed2 = pair_seed;
                pair_seed2.reshape(23, 2);
                pair_seed2 = shuffle(pair_seed2);
            }

            var pair_seq = [];
            for (var ii = 0; ii < pair_seed2.length; ii++) {
                var pair_trial = [pair_seed2[ii]];
                if (Math.max(...pair_seed2[ii]) == attn_idx) {
                    // this trial includes the attention-check trial
                    pair_seq.push({
                        'image_array': pair_trial.map(row => row.map(el => prefix + el.toString().padStart(2, '0'))),
                        'attention_check': prefix + attn_idx.toString()
                    })
                } else {
                    // this trial does not include the attention-check trial
                    pair_seq.push({
                        'image_array': pair_trial.map(row => row.map(el => prefix + el.toString().padStart(2, '0'))),
                    })
                }
            }
            return pair_seq;
        }

        var jspsych_session = [];

        // use the full screen
        jspsych_session.push({
            type: 'fullscreen',
            fullscreen_mode: true
        });

        jspsych_session.push(generate_instruction_page(instr_imglist));

        var prac_seed = generate_pair_seq('prac');
        jspsych_session.push({
            timeline: generate_practice_block('pair', prac_img_src, shuffle(prac_seed), img_ext, task_prompt)
        });

        var main_seed = generate_pair_seq('HPNt');
        main_seed = main_seed.concat(generate_pair_seq('HPUr'));
        main_seed = main_seed.concat(generate_pair_seq('LPNt'));
        main_seed = main_seed.concat(generate_pair_seq('LPUr'));
        jspsych_session.push({
            timeline: generate_main_block('pair', main_img_src, shuffle(main_seed), img_ext, task_prompt)
        });

        // exit the full screen
        jspsych_session.push({
            type: 'fullscreen',
            fullscreen_mode: false
        });

        jsPsych.init({
            timeline: jspsych_session,
            preload_images: instr_imglist,

            display_element: document.querySelector('.display_stage'),

            on_data_update: function (data) { // each time the data is updated:
                // write the current window resolution to the data
                data.win_res = window.innerWidth + 'x' + window.innerHeight;
                data.fullscr = fullscr_ON;
            },

            on_interaction_data_update: function (data) {
                //interaction data logs if participants leaves the browser window or exits full screen mode
                interaction = data.event;
                if (interaction.includes("fullscreen")) {
                    // some unhandy coding to circumvent a bug in jspsych that logs fullscreenexit when actually entering
                    if (fullscr_ON == 'no') {
                        fullscr_ON = 'yes';
                        return fullscr_ON;
                    } else if (fullscr_ON == 'yes') {
                        fullscr_ON = 'no';
                        return fullscr_ON;
                    }
                } else if (interaction == 'blur' || interaction == 'focus') {
                    focus = interaction;
                    return focus;
                }
            },

            on_finish: function () {
                // save the whole experiment data to the server
                save_data();

                // generate the performance key
                if (count_strike < 2) {
                    var perfKey = 'SC' + count_strike.toString() + 'TS' +
                        Math.round(rt_history.reduce(function (a, b) {
                            return (a + b);
                        }, 0) / 1000).toString();
                    console.log("Perf key: ", perfKey);
                    Qualtrics.SurveyEngine.setEmbeddedData("perfKey", perfKey);
                }

                // clear the stage
                jQuery('.display_stage').remove();
                jQuery('.display_stage_background').remove();

                // simulate click on Qualtrics "next" button, making use of the Qualtrics JS API
                qthis.clickNextButton();
            }
        });
    }
});