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

/*
    Preparing 4 multi-image rating trials
    46 images & one attention check image should be prepared in advance
    The attention check image is shown twice
*/

// The prefix of the images should be passed along
function generate_multi_seq(prefix) {

    var attn_idx = 99;
    var multi_seed = shuffle(range(1, 46));
    var multi_trial = [];
    multi_trial[0] = shuffle(multi_seed.slice(0, 12));
    multi_trial[1] = shuffle(multi_seed.slice(12, 24));
    multi_trial[2] = shuffle(multi_seed.slice(24, 35).concat(attn_idx));
    multi_trial[3] = shuffle(multi_seed.slice(35, 46).concat(attn_idx));
    multi_trial = shuffle(multi_trial);

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
    return multi_seq;
}

var test_multi = generate_multi_seq('pn');

console.log(test_multi);

/*
    Preparing 23 pair-wise rating trials
    Input: 46 images
*/

// The prefix of the images should be passed along
function generate_pair_seq(prefix) {

    var pair_seed = shuffle(range(1, 46));
    pair_seed.reshape(23, 2);
    var pair_seed = shuffle(pair_seed);
    
    var pair_seq = [];
    for (var ii = 0; ii < pair_seed.length; ii++) {
        pair_seq.push(pair_seed[ii].map(el => prefix + el.toString().padStart(2, '0')));
    }
    return pair_seq;
}

var test_pair = generate_pair_seq('pn');

console.log(test_pair);