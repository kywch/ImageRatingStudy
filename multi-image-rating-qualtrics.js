Qualtrics.SurveyEngine.addOnload(function () {

    /*Place your JavaScript here to run when the page loads*/

    /* PLEASE CHECK:
        TO RUN THIS SCRIPT PROPERLY, THE EMBEDDED VARIABLES 
            *** image_rating_results ***
        MUST BE DEFINED.
    /*

    /* Change 1: Hiding the Next button */
    // Retrieve Qualtrics object and save in qthis
    var qthis = this;

    // Hide buttons
    qthis.hideNextButton();

    /* Change 2: Defining and loading required resources */
    // `requiredResources` must include all the required JS files
    var task_github = "https://kywch.github.io/ImageRatingStudy/"; // https://<your-github-username>.github.io/<your-experiment-name>
    var requiredResources = [
        task_github + "lib/jspsych-6.1.0/jspsych.js",
        task_github + "lib/jspsych-6.1.0/plugins/jspsych-fullscreen.js",
        task_github + "lib/jspsych-6.1.0/plugins/jspsych-instructions.js",
        task_github + "lib/jspsych-image-rating.js",
        task_github + "lib/image-rating_main.js"
    ];

    function loadScript(idx) {
        console.log("Loading ", requiredResources[idx]);
        jQuery.getScript(requiredResources[idx], function () {
            if ((idx + 1) < requiredResources.length) {
                loadScript(idx + 1);
            } else {
                initExp();
            }
        });
    }

    if (window.Qualtrics && (!window.frameElement || window.frameElement.id !== "mobile-preview-view")) {
        loadScript(0);
    }

    /* Change 3: Appending the display_stage Div using jQuery */
    // jQuery is loaded in Qualtrics by default
    jQuery("<div id = 'display_stage_background'></div>").appendTo('body');
    jQuery("<div id = 'display_stage'></div>").appendTo('body');

    /* Change 4: Wrapping jsPsych.init() in a function */
    function initExp() {

        // Define image locations and a helper functions making generating trial sequence
        // stimuli locations
        var prac_img_src = 'https://kywch.github.io/ImageRatingStudy/images_prac/';
        var main_img_src = 'https://kywch.github.io/ImageRatingStudy/images_main/';
        var img_ext = 'jpg';

        // instruction should match the task prompt
        var instr_url = 'https://kywch.github.io/ImageRatingStudy/instruction_multi/';
        var instr_imglist = get_instruction_imglist(instr_url, 9);

        // required clicks should be four
        var task_prompt = 'Select ' + required_clicks_multi.toString() + ' images that you like.';

        // The prefix of the images should be passed along
        function generate_multi_seq(prefix) {
            /*
                Preparing 4 multi-image rating trials
                46 images & one attention check image should be prepared in advance
                The attention check image is shown twice
            */
            var attn_idx = 99;
            var multi_seed = shuffle(range(1, 46));
            var multi_trial = [];
            multi_trial[0] = shuffle(multi_seed.slice(0, 12));
            multi_trial[1] = shuffle(multi_seed.slice(12, 24));
            multi_trial[2] = shuffle(multi_seed.slice(24, 35).concat(attn_idx));
            multi_trial[3] = shuffle(multi_seed.slice(35, 46).concat(attn_idx));

            var multi_seq = [];
            for (var ii = 0; ii < multi_trial.length; ii++) {
                if (Math.max(...multi_trial[ii]) == attn_idx) {
                    // this trial includes the attention-check trial
                    multi_trial[ii].reshape(3, 4);
                    multi_seq.push({
                        'image_array': multi_trial[ii].map(row => row.map(el => prefix + el.toString().padStart(2, '0'))),
                        'attention_check': prefix + attn_idx.toString()
                    })
                } else {
                    // this trial does not include the attention-check trial
                    multi_trial[ii].reshape(3, 4);
                    multi_seq.push({
                        'image_array': multi_trial[ii].map(row => row.map(el => prefix + el.toString().padStart(2, '0')))
                    })
                }
            }
            return shuffle(multi_seq);
        }

        // Define the experiment flow
        // NOTE that the functions used below are defined in `image-rating_main.js` for readability
        var jspsych_session = [];

        // use the full screen
        jspsych_session.push({
            type: 'fullscreen',
            fullscreen_mode: true
        });

        jspsych_session.push(generate_instruction_page(instr_imglist));

        var prac_seed = generate_multi_seq('prac');
        jspsych_session.push({
            timeline: generate_practice_block('multi', prac_img_src, shuffle(prac_seed), img_ext, task_prompt)
        });

        var main_seed = generate_multi_seq('HPNt');
        main_seed = main_seed.concat(generate_multi_seq('HPUr'));
        main_seed = main_seed.concat(generate_multi_seq('LPNt'));
        main_seed = main_seed.concat(generate_multi_seq('LPUr'));
        jspsych_session.push({
            timeline: generate_main_block('multi', main_img_src, shuffle(main_seed), img_ext, task_prompt)
        });

        // exit the full screen
        jspsych_session.push({
            type: 'fullscreen',
            fullscreen_mode: false
        });

        // Run the experiment
        jsPsych.init({
            display_element: 'display_stage',
            timeline: jspsych_session,
            preload_images: instr_imglist,

            exclusions: { // browser window needs to have these dimensions, if not, participants get the chance to maximize their window, if they don't support this resolution when maximized they can't particiate.
                min_width: 1000,
                min_height: 700
            },

            on_finish: function () {

                // save the data
                Qualtrics.SurveyEngine.setEmbeddedData("image_rating_results", result_string);

                function sleep(time) {
                    return new Promise((resolve) => setTimeout(resolve, time));
                }

                sleep(500).then(() => {
                    saved_string = Qualtrics.SurveyEngine.getEmbeddedData("image_rating_results");
                    //console.log(saved_string);
                    if (result_string !== saved_string) {
                        console.log('There was a problem with saving data. Trying again...')
                        // try to save it once more, but no guarantee
                        Qualtrics.SurveyEngine.setEmbeddedData("image_rating_results", result_string);
                    } else {
                        console.log('Save was successful.')
                    }
                });

                sleep(500).then(() => {
                    // clear the stage
                    jQuery('#display_stage').remove();
                    jQuery('#display_stage_background').remove();

                    // simulate click on Qualtrics "next" button, making use of the Qualtrics JS API
                    qthis.clickNextButton();
                });
            }
        });
    }
});

Qualtrics.SurveyEngine.addOnReady(function () {
    /*Place your JavaScript here to run when the page is fully displayed*/

});

Qualtrics.SurveyEngine.addOnUnload(function () {
    /*Place your JavaScript here to run when the page is unloaded*/

});