/**
 * image-rating_main.js
 * Kyoung Whan Choe (https://github.com/kywch/)
 *
 * Image Rating Study: a head-to-head comparison between the multi-image vs. pairwise rating
 *
 **/

/*
 * Generic task variables
 */
var flag_debug = false;
if (flag_debug) {
    var trial_dur_multi = 1000;
    var trial_dur_pair = 500;
} else {
    var trial_dur_multi = 8000;
    var trial_dur_pair = 2000;
}

var required_clicks_multi = 4;
var count_strike = 0;
var rt_history = [];

// a single result string will be generated for saving to qualtrics
var result_string = '';

// activity tracking
var focus = 'focus'; // tracks if the current tab/window is the active tab/window, initially the current tab should be focused
var fullscr_ON = 'no'; // tracks fullscreen activity, initially not activated
var fullscr_history = [];


/*
 * Helper functions
 */
const range = (start, numEle) => [...Array(numEle)].map((_, ii) => start + ii)

function shuffle(array) {
    let counter = array.length;
    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);
        // Decrease counter by 1
        counter--;
        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

Array.prototype.reshape = function (rows, cols) {
    var copy = this.slice(0); // Copy all elements.
    this.length = 0; // Clear out existing array.

    for (var r = 0; r < rows; r++) {
        var row = [];
        for (var c = 0; c < cols; c++) {
            var i = r * cols + c;
            if (i < copy.length) {
                row.push(copy[i]);
            }
        }
        this.push(row);
    }
};

function transpose(matrix) {
    return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

function generate_stimuli_mat(img_src, img_array, img_ext) {
    var nrows = img_array.length;
    var ncols = img_array[0].length;
    tmp_mat = [];
    for (var row = 0; row < nrows; row++) {
        tmp_row = [];
        for (var col = 0; col < ncols; col++) {
            tmp_row.push(img_src + img_array[row][col] + '.' + img_ext);
        }
        tmp_mat.push(tmp_row);
    }
    return tmp_mat;
}


/*
 * image rating instruction page
 */
function get_instruction_imglist(instr_url, num_slides) {
    var imglist = [];
    for (var ii = 0; ii < num_slides; ii++) {
        imglist.push(instr_url + 'Slide' + (ii + 1).toString() + '.JPG');
    }
    return imglist;
}

function generate_instruction_page(imglist) {
    var instructions_page = {
        type: 'instructions',
        pages: function () {
            var pages = [];
            for (var ii = 0; ii < imglist.length; ii++) {
                pages.push('<img class="resize" src="' + imglist[ii] + '">');
            }
            pages.push('<div class = centerbox><p class = block-text>You can read the instruction again by clicking the <strong>Previous</strong> button.</p>' +
                '<p class = block-text>Clicking the <strong>Next</strong> button will finish the instruction.</p></div>');
            return pages;
        },
        data: {
            exp_stage: 'task_instructions_page'
        },
        allow_keys: false,
        show_clickable_nav: true,
        show_page_number: true
    };
    return instructions_page;
}

/*
 * Practice block
 */
function generate_practice_block(condition, prac_img_src, prac_seq, img_ext, task_prompt) {

    var block_sequence = [];
    var num_trial = prac_seq.length;

    var practice_start_page = {
        type: 'instructions',
        pages: [
            '<div class = centerbox><p class = block-text>Click next to start practice.</p></div>'
        ],
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: false,
        show_page_number: false,
        data: {
            exp_stage: 'practice_start'
        }
    };
    block_sequence.push(practice_start_page);

    if (condition == 'multi') {
        for (var ii = 0; ii < num_trial; ii++) {
            var multi_trial = {
                type: 'image-rating',
                prompt_header: '<p class=very-large align=center>' + task_prompt + '</p>',
                prompt_footer: '<p class=large><<< Drag the blurry image to the <b>trash can</b>.<br>' +
                    'Trial number: ' + (ii + 1).toString() + ' / ' + num_trial.toString() + '</p>',
                image_array: prac_seq[ii].image_array,
                attention_check: prac_seq[ii].attention_check,
                practice_flag: true,
                required_clicks: required_clicks_multi,
                trial_duration: trial_dur_multi,
                stimuli: generate_stimuli_mat(prac_img_src, prac_seq[ii].image_array, img_ext),
                data: {
                    exp_stage: 'practice_trial_' + (ii + 1).toString()
                }
            }
            block_sequence.push(multi_trial);
        }
    } else if (condition == 'pair') {
        for (var ii = 0; ii < num_trial; ii++) {
            var pair_trial = {
                type: 'image-rating',
                prompt_header: '<p class=very-large align=center>' + task_prompt + '</p>',
                prompt_footer: '<p class=large>Trial number: ' + (ii + 1).toString() + ' / ' + num_trial.toString() + '</p>',
                trash_can: '',
                image_array: prac_seq[ii].image_array,
                attention_check: prac_seq[ii].attention_check,
                practice_flag: true,
                required_clicks: 1,
                trial_duration: trial_dur_pair,
                image_size: [560, 420],
                stimuli: generate_stimuli_mat(prac_img_src, prac_seq[ii].image_array, img_ext),
                data: {
                    exp_stage: 'practice_trial_' + (ii + 1).toString()
                }
            }
            block_sequence.push(pair_trial);
        }
    } else {
        alert('ERROR!! Wrong condition in generate_practice_block. Quitting the experiment.');
        jsPsych.endExperiment('ERROR!! Wrong condition in generate_practice_block.');
    }

    return block_sequence;
}


/*
 * Main block
 * Implelment the 3-strikes-out policy
 */
function generate_main_block(condition, main_img_src, main_seq, img_ext, task_prompt, num_break = 19) {

    var block_sequence = [];
    var num_trial = main_seq.length;

    var main_start_page = {
        type: 'instructions',
        pages: function () {
            var pages = [];
            pages.push('<div class = centerbox><p class = block-text>The practice is finished. You can take a short break.</p></div>');
            if (condition == "multi") {
                pages.push('<div class = centerbox><p class = block-text>WARNING!! If you miss the blurry image twice, the study will be finished without the secret key.</p></div>');
            }
            pages.push('<div class = centerbox><p class = block-text>Click next to begin the main trials.</p></div>')
            return pages;
        },
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: true,
        show_page_number: false,
        data: {
            exp_stage: 'main_start'
        },
        on_finish: function() {
            if (condition == 'multi') {
                // csv-like string: delimiter - space (' '), newline - semicolon (';')
                result_string = 'trial image11 image12 image13 image14 image21 image22 image23 image24 image31 image32 image33 image34 click rt;';
            } else {
                // csv-like string: delimiter - space (' '), newline - semicolon (';')
                result_string = 'trial image11 image12 click rt;';
            }
        }
    };
    block_sequence.push(main_start_page);

    var break_page = {
        type: 'instructions',
        pages: [
            '<div class = centerbox><p class = block-text>You can take a short break. Click next to continue.</p>'
        ],
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: false,
        show_page_number: false,
        data: {
            exp_stage: 'main_break'
        }
    };

    if (condition == 'multi') {
        for (var ii = 0; ii < num_trial; ii++) {
            var multi_trial = {
                type: 'image-rating',
                prompt_header: '<p class=very-large align=center>' + task_prompt + '</p>',
                prompt_footer: '<p class=large><<< Drag the blurry image to the <b>trash can</b>.<br>' +
                    'Trial number: ' + (ii + 1).toString() + ' / ' + num_trial.toString() + '</p>',
                image_array: main_seq[ii].image_array,
                attention_check: main_seq[ii].attention_check,
                required_clicks: required_clicks_multi,
                trial_duration: trial_dur_multi,
                stimuli: generate_stimuli_mat(main_img_src, main_seq[ii].image_array, img_ext),
                data: {
                    exp_stage: 'main_trial_' + (ii + 1).toString(),
                    trial_cnt: (ii + 1).toString()
                },
                on_finish: function (data) {
                    rt_history.push(data.rt);

                    let flat_images = data.image_array.flat();

                    // convert click to binary string
                    let click_string = flat_images.map(el => {
                        if (data.clicked.includes(el)) {
                            return '1';
                        } else {
                            return '0';
                        }
                    }).toString().replace(/,/g, '');

                    // csv-like string: delimiter - space (' '), newline - semicolon (';')
                    //results_string = 'trial image11 image12 image13 image14 image21 image22 image23 image24 image31 image32 image33 image34 click rt;';
                    result_string += data.trial_cnt + ' ' + // trial
                        flat_images.toString().replace(/,/g, ' ') + ' ' + // 12 image names
                        click_string + ' ' + Math.round(data.rt).toString() + ';';

                    if (data.flag_attention == false) {
                        count_strike++;
                        if (count_strike == 1) {
                            alert('WARNING!! You did not drag the blurry picture to the trash can! One more miss will terminate your session.');
                        } else if (count_strike >= 2) {
                            alert('SORRY. You failed the attention check. Your session is terminated.');
                            jsPsych.endExperiment('Attention check failed.');
                        }
                    }
                    if (flag_debug) {
                        console.log(data);
                        console.log("Strike count:", count_strike);
                    }
                }
            }
            block_sequence.push(multi_trial);
            if (ii % num_trial == 8) {
                block_sequence.push(break_page);
            }
        }
    } else if (condition == 'pair') {
        for (var ii = 0; ii < num_trial; ii++) {
            var pair_trial = {
                type: 'image-rating',
                prompt_header: '<p class=very-large align=center>' + task_prompt + '</p>',
                prompt_footer: '<p class=large>Trial number: ' + (ii + 1).toString() + ' / ' + num_trial.toString() + '</p>',
                trash_can: '',
                image_array: main_seq[ii].image_array,
                attention_check: main_seq[ii].attention_check,
                required_clicks: 1,
                trial_duration: trial_dur_pair,
                image_size: [560, 420],
                stimuli: generate_stimuli_mat(main_img_src, main_seq[ii].image_array, img_ext),
                data: {
                    exp_stage: 'main_trial_' + (ii + 1).toString(),
                    trial_cnt: (ii + 1).toString()
                },
                on_finish: function (data) {
                    rt_history.push(data.rt);

                    let flat_images = data.image_array.flat();

                    // convert click to binary string
                    let click_string = flat_images.map(el => {
                        if (data.clicked.includes(el)) {
                            return '1';
                        } else {
                            return '0';
                        }
                    }).toString().replace(/,/g, '');

                    // csv-like string: delimiter - space (' '), newline - semicolon (';')
                    //results_string = 'trial image11 image12 click rt;';
                    result_string += data.trial_cnt + ' ' + // trial
                        flat_images.toString().replace(/,/g, ' ') + ' ' + // 12 image names
                        click_string + ' ' + Math.round(data.rt).toString() + ';';

                    if (data.flag_attention == false) {
                        count_strike++;
                        if (count_strike == 1) {
                            alert('WARNING!! You did not drag the blurry picture to the trash can! One more miss will terminate your session.');
                        } else if (count_strike >= 2) {
                            alert('SORRY. You failed the attention check. Your session is terminated.');
                            jsPsych.endExperiment('Attention check failed.');
                        }
                    }
                    if (flag_debug) {
                        console.log(data);
                        console.log("Strike count:", count_strike);
                    }
                }
            }
            block_sequence.push(pair_trial);
            if (ii % num_break == (num_break - 1)) {
                block_sequence.push(break_page);
            }
        }
    } else {
        alert('ERROR!! Wrong condition in generate_main_block. Quitting the experiment.');
        jsPsych.endExperiment('ERROR!! Wrong condition in generate_main_block.');
    }

    return block_sequence;
}