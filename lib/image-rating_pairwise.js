/**
 * image-rating_pairwise.js
 * Kyoung Whan Choe (https://github.com/kywch/)
 *
 * Pairwise image rating
 *
 **/

/*
 * Generic task variables
 */
var sbjId = ""; // mturk id
var task_id = ""; // the prefix for the save file -- the main seq
var data_dir = "";
var flag_debug = false;
var trial_dur_pair = 500;

var count_strike = 0;

// summary variables to put into qualtrics
var left_stim = [];
var right_stim = [];
var winner_list = [];
var rt_history = [];
var fullscr_history = [];

// activity tracking
var focus = 'focus'; // tracks if the current tab/window is the active tab/window, initially the current tab should be focused
var fullscr_ON = 'no'; // tracks fullscreen activity, initially not activated

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

// YOU MUST GET YOUR OWN DROPBOX ACCESS TOKEN for uploading the file to your dropbox
// from https://dropbox.github.io/dropbox-api-v2-explorer/#files_upload
var dropbox_access_token = '';
var dropbox_save_folder = ''
var save_filename = task_id + '_' + sbjId + '.json';

function save_data() {
    // if you prefer json-format, use jsPsych.data.get().json()
    // if you prefer csv-format, use jsPsych.data.get().csv()
    if (flag_debug) {
        console.log("Save data function called.");
        console.log(jsPsych.data.get().json());
    }
    try {
        var dbx = new Dropbox.Dropbox({ accessToken: dropbox_access_token });
        dbx.filesUpload({path: dropbox_save_folder + save_filename, contents: jsPsych.data.get().json()})
        .then(function(response) {
            if (flag_debug) {
                console.log(response);
            }
        })
        .catch(function(error) {
            console.error(error);
        });
    }
    catch(err) {
        console.log("Save data function failed.", err);
    }
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
            exp_stage: 'task_instructions_page',
            task_id: task_id,
            sbj_id: sbjId
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
function generate_practice_block(prac_img_src, prac_seq, img_ext, task_prompt) {

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
            exp_stage: 'practice_start',
            task_id: task_id,
            sbj_id: sbjId
        }
    };
    block_sequence.push(practice_start_page);

    for (var ii = 0; ii < num_trial; ii++) {
        var pair_trial = {
            type: 'multi-rating-trial',
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

    return block_sequence;
}


/*
 * Main block
 * Implelment the 3-strikes-out policy
 */
function generate_main_block(main_img_src, main_seq, img_ext, task_prompt, num_break = 30) {

    var block_sequence = [];
    var num_trial = main_seq.length;

    var main_start_page = {
        type: 'instructions',
        pages: function () {
            var pages = [];
            pages.push('<div class = centerbox><p class = block-text>The practice is finished. You can take a short break.</p></div>');
            pages.push('<div class = centerbox><p class = block-text>Click next to begin the main trials.</p></div>')
            return pages;
        },
        allow_keys: false,
        show_clickable_nav: true,
        allow_backward: true,
        show_page_number: false,
        data: {
            exp_stage: 'main_start',
            task_id: task_id,
            sbj_id: sbjId
        },
        on_finish: function (data) {
            save_data();
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
        },
        on_finish: function (data) {
            save_data();
        }
    };

    for (var ii = 0; ii < num_trial; ii++) {
        var pair_trial = {
            type: 'multi-rating-trial',
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
                exp_stage: 'main_trial_' + (ii + 1).toString()
            },
            on_finish: function (data) {
                winner_list.push(data.clicked[0]);
                rt_history.push(data.rt);
                if (data.flag_attention == false) {
                    count_strike++;
                    if (count_strike == 1) {
                        save_data();
                        alert('WARNING!! You did not drag the blurry picture to the trash can! One more miss will terminate your session.');
                    } else if (count_strike >= 2) {
                        save_data();
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

        // generate stim list for qualtrics
        left_stim.push(main_seq[ii].image_array[0][0]);
        right_stim.push(main_seq[ii].image_array[0][1]);

        if (ii % num_break == (num_break - 1)) {
            block_sequence.push(break_page);
        }
    }

    return block_sequence;
}